import { useCallback, useRef } from 'react';
import { useIsStreaming, useStreamingMeta, getStreamingContent } from '../store/streamingStore';
import { useServerChat } from './queries';
import type { Speaker } from '../types/chat';
import { createStreamingSessionMachine, type StreamingSessionMachine } from '../streaming/sessionMachine';

export interface StreamingOptions {
  /** Parent message ID. Defaults to current tail_id */
  parentId?: string;
  /** Speaker: 'user', 'bot', or a specific speaker ID */
  speaker?: 'user' | 'bot' | string;
}

export interface StreamingAPI {
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Current streaming content buffer */
  content: string;
  /** Current speaker */
  speaker: Speaker | null;
  
  /** Start streaming a new message */
  start: (options?: StreamingOptions) => boolean;
  /** Append content to the stream */
  append: (chunk: string) => void;
  /** Set entire content (replaces) */
  setContent: (content: string) => void;
  /** Finalize and persist to server. Returns true on success */
  finalize: () => Promise<boolean>;
  /** Cancel streaming without persisting */
  cancel: () => void;
}

/**
 * High-level streaming API for creating streamed messages.
 * 
 * Features:
 * - Auto-selects parent (tail_id) and speaker (bot/user)
 * - Creates a real message immediately (optimistic), streams into it, then PATCHes content on finalize
 * - Uses TanStack Query for state management
 * 
 * @example
 * ```tsx
 * const streaming = useStreaming();
 * 
 * // Start a bot message at the current tail
 * streaming.start({ speaker: 'bot' });
 * 
 * // Stream tokens
 * streaming.append('Hello ');
 * streaming.append('world!');
 * 
 * // Persist to server
 * await streaming.finalize();
 * ```
 */
export function useStreaming(): StreamingAPI {
  const isStreaming = useIsStreaming();
  const meta = useStreamingMeta();
  
  const { chatId, addMessage, editMessage, deleteMessage, speakers, tailId, nodes } = useServerChat();
  
  // Refs to avoid stale closures in callbacks
  const chatIdRef = useRef(chatId);
  const addMessageRef = useRef(addMessage);
  const editMessageRef = useRef(editMessage);
  const deleteMessageRef = useRef(deleteMessage);
  const speakersRef = useRef(speakers);
  const tailIdRef = useRef(tailId);
  const nodesRef = useRef(nodes);
  chatIdRef.current = chatId;
  addMessageRef.current = addMessage;
  editMessageRef.current = editMessage;
  deleteMessageRef.current = deleteMessage;
  speakersRef.current = speakers;
  tailIdRef.current = tailId;
  nodesRef.current = nodes;

  // Streaming session machine (single instance, uses injected getters to read latest refs).
  const machineRef = useRef<StreamingSessionMachine | null>(null);
  if (!machineRef.current) {
    machineRef.current = createStreamingSessionMachine({
      getChatId: () => chatIdRef.current,
      getTailId: () => tailIdRef.current,
      getSpeakers: () => speakersRef.current,
      getNodes: () => nodesRef.current,
      addMessage: (...args) => addMessageRef.current(...args),
      editMessage: (...args) => editMessageRef.current(...args),
      deleteMessage: (...args) => deleteMessageRef.current(...args),
    });
  }
  
  // Get speaker object for current ethereal message
  const currentSpeaker = meta ? speakers.get(meta.speakerId) ?? null : null;
  
  const start = useCallback((options: StreamingOptions = {}): boolean => {
    return machineRef.current?.start(options) ?? false;
  }, []);
  
  const append = useCallback((chunk: string): void => {
    machineRef.current?.append(chunk);
  }, []);
  
  const setContent = useCallback((content: string): void => {
    machineRef.current?.setContent(content);
  }, []);
  
  const finalize = useCallback(async (): Promise<boolean> => {
    return (await machineRef.current?.finalize()) ?? false;
  }, []);
  
  const cancel = useCallback((): void => {
    machineRef.current?.cancel();
  }, []);
  
  return {
    isStreaming,
    content: getStreamingContent(),
    speaker: currentSpeaker,
    start,
    append,
    setContent,
    finalize,
    cancel,
  };
}
