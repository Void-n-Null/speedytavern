import { create } from 'zustand';

/**
 * Streaming message metadata.
 * Content is stored separately in refs to avoid re-renders on every chunk.
 */
export interface StreamingMeta {
  parentId: string;
  speakerId: string;
  startedAt: number;
  /**
   * Client-stable id for the message node (used to match optimistic temp -> real id).
   * This is stored on the ChatNode as `client_id`.
   */
  nodeClientId: string;
}

/**
 * Full streaming message snapshot (for finalization/persistence).
 */
export interface StreamingMessage extends StreamingMeta {
  content: string;
}

// ============ Ref-based content storage (no React re-renders) ============

/** Raw content buffer - updated on every append, no re-renders */
let contentBuffer = '';

/** Listeners for content updates (DOM refs subscribe here) */
type ContentListener = (raw: string) => void;
const contentListeners = new Set<ContentListener>();

// ============ Flush scheduling (frame-throttled) ============
/**
 * Streaming can arrive character-by-character. Parsing & notifying on every chunk is O(n^2).
 * We instead coalesce updates to at most once per animation frame.
 */
let flushScheduled = false;

/** Subscribe to content updates (for ref-based DOM updates) */
export function subscribeToContent(listener: ContentListener): () => void {
  contentListeners.add(listener);
  return () => contentListeners.delete(listener);
}

/** Notify all listeners of content update */
function notifyContentListeners() {
  contentListeners.forEach((listener) => listener(contentBuffer));
}

/** Get current raw content (for persistence) */
export function getStreamingContent(): string {
  return contentBuffer;
}

// ============ Zustand store (minimal state, only triggers renders on start/stop) ============

interface StreamingStore {
  // State - only metadata, content is in refs
  meta: StreamingMeta | null;
  
  // Version counter - incremented on each content update for useSyncExternalStore compatibility
  contentVersion: number;
  
  // Actions
  start: (parentId: string, speakerId: string, nodeClientId: string) => void;
  append: (chunk: string) => void;
  setContent: (content: string) => void;
  finalize: () => StreamingMessage | null;
  cancel: () => void;
}

/**
 * Streaming store with ref-based content for performance.
 * 
 * Key optimization: Content updates do NOT trigger React re-renders.
 * - `meta` (parentId, speakerId, startedAt) - triggers re-renders (start/stop only)
 * - `contentBuffer` - ref-based, updated via subscribeToContent()
 * 
 * Components use subscribeToContent() to update DOM directly via refs.
 */
export const useStreamingStore = create<StreamingStore>((set, get) => ({
  meta: null,
  contentVersion: 0,

  start: (parentId, speakerId, nodeClientId) => {
    // Reset content buffer
    contentBuffer = '';
    
    // Set metadata (triggers re-render for components watching meta)
    set({
      meta: {
        parentId,
        speakerId,
        startedAt: Date.now(),
        nodeClientId,
      },
      contentVersion: 0,
    });
  },

  append: (chunk) => {
    if (!get().meta) return;
    
    // Update buffer (no re-render)
    contentBuffer += chunk;

    // Coalesce parse + notify to once per frame.
    if (flushScheduled) return;
    flushScheduled = true;

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;

    schedule(() => {
      flushScheduled = false;
      // Increment version for external store compatibility
      set(state => ({ contentVersion: state.contentVersion + 1 }));
      // Notify DOM listeners (ref-based updates)
      notifyContentListeners();
    });
  },

  setContent: (content) => {
    if (!get().meta) return;
    
    // Reset buffer with new content
    contentBuffer = content;

    // Immediate flush for full content replacement.
    flushScheduled = false;
    set(state => ({ contentVersion: state.contentVersion + 1 }));
    notifyContentListeners();
  },

  finalize: () => {
    const { meta } = get();
    if (!meta) return null;
    
    // Capture full message
    const message: StreamingMessage = {
      ...meta,
      content: contentBuffer,
    };
    
    // Clear state
    contentBuffer = '';
    set({ meta: null, contentVersion: 0 });
    
    return message;
  },

  cancel: () => {
    contentBuffer = '';
    set({ meta: null, contentVersion: 0 });
  },
}));

// ============ Selector Hooks (minimal re-renders) ============

/**
 * Subscribe to streaming state changes.
 * Only re-renders when streaming starts/stops.
 */
export function useIsStreaming(): boolean {
  return useStreamingStore((state) => state.meta !== null);
}

/**
 * Get streaming metadata if streaming.
 * Re-renders only when streaming starts/stops.
 */
export function useStreamingMeta(): StreamingMeta | null {
  return useStreamingStore((state) => state.meta);
}

/**
 * Subscribe to whether a given message node (by `client_id`) is currently streaming.
 *
 * Key perf property: most messages will keep returning `false` even when streaming starts/stops,
 * so they will NOT re-render on streaming meta churn.
 */
export function useIsStreamingNode(nodeClientId: string | null | undefined): boolean {
  return useStreamingStore((state) => {
    if (!nodeClientId) return false;
    return state.meta?.nodeClientId === nodeClientId;
  });
}

/**
 * Get the full streaming message snapshot (meta + current content) if streaming.
 * NOTE: This reads content from the ref, so it won't trigger re-renders on content change.
 * Use subscribeToContent() for real-time DOM updates.
 */
export function useStreamingMessage(): StreamingMessage | null {
  const meta = useStreamingStore((state) => state.meta);
  if (!meta) return null;
  return { ...meta, content: contentBuffer };
}

// Back-compat aliases (to be removed once ethereal is fully removed)
export const useEtherealMeta = useStreamingMeta;
export const useEtherealMessage = useStreamingMessage;
