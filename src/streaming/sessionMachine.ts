import type { ChatNode, Speaker } from '../types/chat';
import { useStreamingStore, getStreamingContent } from '../store/streamingStore';
import { normalizeFencedCodeBlocks } from '../utils/streamingMarkdown';

export interface StreamingSessionStartOptions {
  /** Parent message ID. Defaults to current tail_id */
  parentId?: string;
  /** Speaker: 'user', 'bot', or a specific speaker ID */
  speaker?: 'user' | 'bot' | string;
}

export interface StreamingSessionDeps {
  getChatId: () => string | undefined;
  getTailId: () => string | null | undefined;
  getSpeakers: () => Map<string, Speaker>;
  getNodes: () => Map<string, ChatNode>;

  addMessage: (
    parentId: string | null,
    content: string,
    speakerId: string,
    isBot: boolean,
    createdAt?: number,
    id?: string
  ) => Promise<{ id: string; created_at: number }>;
  editMessage: (nodeId: string, content: string) => Promise<unknown>;
  deleteMessage: (nodeId: string) => Promise<unknown>;
}

export interface StreamingSessionMachine {
  start: (options?: StreamingSessionStartOptions) => boolean;
  append: (chunk: string) => void;
  setContent: (content: string) => void;
  finalize: () => Promise<boolean>;
  cancel: () => void;
}

type CreateResult = { id: string; created_at: number };

type IdleState = { status: 'idle' };
type ActiveState = {
  status: 'starting' | 'streaming' | 'finalizing' | 'cancelling';
  sessionId: number;
  parentId: string;
  speakerId: string;
  nodeClientId: string;
  startedAt: number;
  createPromise: Promise<CreateResult>;
  createdId: string | null;
};

type State = IdleState | ActiveState;

function pickSpeakerId(
  speakers: Map<string, Speaker>,
  input: StreamingSessionStartOptions['speaker']
): string | null {
  if (input === 'user') {
    const user = Array.from(speakers.values()).find((s) => s.is_user);
    return user?.id ?? null;
  }

  if (input === 'bot' || input === undefined) {
    const bot = Array.from(speakers.values()).find((s) => !s.is_user);
    return bot?.id ?? null;
  }

  // Specific speaker id provided
  return input;
}

function findNodeByClientId(nodes: Map<string, ChatNode>, clientId: string): ChatNode | null {
  for (const n of nodes.values()) {
    if (n.client_id === clientId || n.id === clientId) return n;
  }
  return null;
}

/**
 * Dependency-free streaming session state machine.
 *
 * Purpose: centralize create→stream→finalize/cancel lifecycle and side-effects
 * without changing the ref-based streaming buffer model (no re-render per chunk).
 */
export function createStreamingSessionMachine(deps: StreamingSessionDeps): StreamingSessionMachine {
  let state: State = { status: 'idle' };
  let sessionCounter = 0;

  const isSameSession = (sid: number): boolean => state.status !== 'idle' && state.sessionId === sid;

  const cancelStoreIfActive = (nodeClientId: string) => {
    const active = useStreamingStore.getState().meta;
    if (active?.nodeClientId === nodeClientId) {
      useStreamingStore.getState().cancel();
    }
  };

  const start: StreamingSessionMachine['start'] = (options = {}): boolean => {
    // If a session is already active, cancel it first to avoid leaking placeholders.
    if (state.status !== 'idle') {
      cancel();
    }

    const speakers = deps.getSpeakers();

    // Determine parent
    const parentId = options.parentId ?? deps.getTailId();
    if (!parentId) {
      console.warn('[streaming/sessionMachine] Cannot start: no parent ID available');
      return false;
    }

    // Determine speaker
    const speakerId = pickSpeakerId(speakers, options.speaker);
    if (!speakerId) {
      console.warn('[streaming/sessionMachine] Cannot start: no speaker found');
      return false;
    }

    // Client-stable id used to match `ChatNode.client_id` across optimistic updates.
    const nodeClientId = crypto.randomUUID();

    // Start streaming state BEFORE inserting into chat so the message renders as streaming immediately.
    useStreamingStore.getState().start(parentId, speakerId, nodeClientId);
    const startedAt = useStreamingStore.getState().meta?.startedAt ?? Date.now();

    // Determine if bot message.
    const speaker = speakers.get(speakerId);
    const isBot = speaker ? !speaker.is_user : true;

    // Kick off real message creation with EMPTY content (optimistic insert happens immediately).
    const createPromise = deps.addMessage(parentId, '', speakerId, isBot, startedAt, nodeClientId);

    sessionCounter += 1;
    const sessionId = sessionCounter;

    // Enter starting then streaming (append allowed immediately).
    state = {
      status: 'starting',
      sessionId,
      parentId,
      speakerId,
      nodeClientId,
      startedAt,
      createPromise,
      createdId: null,
    };
    state = { ...state, status: 'streaming' };

    // Track created id when the server responds.
    void createPromise
      .then((r) => {
        if (!isSameSession(sessionId)) return;
        if (state.status === 'idle') return;
        state = { ...state, createdId: r.id };
      })
      .catch(() => {
        if (!isSameSession(sessionId)) return;
        // If creation fails, clear streaming so we don't keep "typing" into nothing.
        cancelStoreIfActive(nodeClientId);
        state = { status: 'idle' };
      });

    return true;
  };

  const append: StreamingSessionMachine['append'] = (chunk) => {
    useStreamingStore.getState().append(chunk);
  };

  const setContent: StreamingSessionMachine['setContent'] = (content) => {
    useStreamingStore.getState().setContent(content);
  };

  const finalize: StreamingSessionMachine['finalize'] = async (): Promise<boolean> => {
    if (state.status === 'idle') {
      console.warn('[streaming/sessionMachine] Finalize called but no active session');
      return false;
    }

    const s = state;
    const sid = s.sessionId;
    state = { ...s, status: 'finalizing' };

    const raw = getStreamingContent();
    const normalizedContent = normalizeFencedCodeBlocks(raw);

    if (!normalizedContent.trim()) {
      console.warn('[streaming/sessionMachine] Finalize called but message is empty');

      // Treat as cancel-like cleanup: stop streaming UI and delete placeholder.
      cancelStoreIfActive(s.nodeClientId);

      const node = findNodeByClientId(deps.getNodes(), s.nodeClientId);
      if (node) {
        void deps.deleteMessage(node.id).catch(() => {});
      }

      // Important: delete the server-created node once creation completes, regardless of future starts.
      void s.createPromise.then((r) => deps.deleteMessage(r.id)).catch(() => {});

      if (isSameSession(sid)) state = { status: 'idle' };
      return false;
    }

    const chatId = deps.getChatId();
    if (!chatId) {
      console.error('[streaming/sessionMachine] Cannot persist: no chat ID');
      if (isSameSession(sid)) state = { status: 'idle' };
      return false;
    }

    try {
      const created = s.createdId ? ({ id: s.createdId, created_at: s.startedAt } as CreateResult) : await s.createPromise;
      const nodeId = created?.id ?? null;
      if (!nodeId) throw new Error('No created message id available for finalize');

      await deps.editMessage(nodeId, normalizedContent);

      // Stop streaming state (only for this session’s node).
      cancelStoreIfActive(s.nodeClientId);

      if (isSameSession(sid)) state = { status: 'idle' };
      return true;
    } catch (err) {
      console.error('[streaming/sessionMachine] ❌ Failed to finalize:', err);
      // On failure, cancel streaming but keep the placeholder; user can delete manually.
      cancelStoreIfActive(s.nodeClientId);
      if (isSameSession(sid)) state = { status: 'idle' };
      return false;
    }
  };

  const cancel: StreamingSessionMachine['cancel'] = (): void => {
    if (state.status === 'idle') return;

    const s = state;
    const sid = s.sessionId;
    state = { ...s, status: 'cancelling' };

    // Stop streaming immediately (UI) for this session’s node.
    cancelStoreIfActive(s.nodeClientId);

    // Remove the placeholder node from the chat tree.
    const node = findNodeByClientId(deps.getNodes(), s.nodeClientId);
    if (node) {
      void deps.deleteMessage(node.id).catch(() => {});
    }

    // If the server creation is still in flight, clean it up once it lands
    // even if a new session starts later (otherwise we orphan empty rows).
    void s.createPromise
      .then((r) => {
        // Only perform server cleanup if this cancelled session is still the one we cancelled.
        // We intentionally do NOT use any "global cancelled id" gate here; each session carries
        // its own createPromise/id, so deleting it cannot affect newer sessions.
        return deps.deleteMessage(r.id).then(() => {});
      })
      .catch(() => {});

    if (isSameSession(sid)) state = { status: 'idle' };
  };

  return { start, append, setContent, finalize, cancel };
}

