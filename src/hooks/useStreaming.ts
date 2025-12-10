import { useCallback, useRef } from 'react';
import { useStreamingStore, useIsStreaming, useEtherealMessage } from '../store/streamingStore';
import { useServerChat } from './queries';
import type { Speaker } from '../types/chat';

export interface StreamingOptions {
  /** Parent message ID. Defaults to current tail_id */
  parentId?: string;
  /** Speaker: 'user', 'bot', or a specific speaker ID */
  speaker?: 'user' | 'bot' | string;
}

export interface StreamingAPI {
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Current ethereal message content */
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
 * High-level streaming API for creating ethereal messages.
 * 
 * Features:
 * - Auto-selects parent (tail_id) and speaker (bot/user)
 * - Handles server persistence on finalize
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
  const ethereal = useEtherealMessage();
  
  const { chatId, addMessage, speakers, tailId } = useServerChat();
  
  // Refs to avoid stale closures in callbacks
  const chatIdRef = useRef(chatId);
  const addMessageRef = useRef(addMessage);
  const speakersRef = useRef(speakers);
  const tailIdRef = useRef(tailId);
  chatIdRef.current = chatId;
  addMessageRef.current = addMessage;
  speakersRef.current = speakers;
  tailIdRef.current = tailId;
  
  // Get speaker object for current ethereal message
  const currentSpeaker = ethereal ? speakers.get(ethereal.speakerId) ?? null : null;
  
  const start = useCallback((options: StreamingOptions = {}): boolean => {
    const { start: storeStart } = useStreamingStore.getState();
    const currentTailId = tailIdRef.current;
    const currentSpeakers = speakersRef.current;
    
    // Determine parent
    const parentId = options.parentId ?? currentTailId;
    if (!parentId) {
      console.warn('[useStreaming] Cannot start: no parent ID available');
      return false;
    }
    
    // Determine speaker
    let speakerId: string | undefined;
    
    if (options.speaker === 'user') {
      const userSpeaker = Array.from(currentSpeakers.values()).find(s => s.is_user);
      speakerId = userSpeaker?.id;
    } else if (options.speaker === 'bot' || options.speaker === undefined) {
      const botSpeaker = Array.from(currentSpeakers.values()).find(s => !s.is_user);
      speakerId = botSpeaker?.id;
    } else {
      // Specific speaker ID provided
      speakerId = options.speaker;
    }
    
    if (!speakerId) {
      console.warn('[useStreaming] Cannot start: no speaker found');
      return false;
    }
    
    storeStart(parentId, speakerId);
    console.log('[useStreaming] Started with parent:', parentId, 'speaker:', speakerId);
    return true;
  }, []);
  
  const append = useCallback((chunk: string): void => {
    useStreamingStore.getState().append(chunk);
  }, []);
  
  const setContent = useCallback((content: string): void => {
    useStreamingStore.getState().setContent(content);
  }, []);
  
  const finalize = useCallback(async (): Promise<boolean> => {
    const { ethereal, cancel } = useStreamingStore.getState();
    const currentSpeakers = speakersRef.current;
    
    // Get ethereal data WITHOUT clearing it yet
    const etherealMsg = ethereal;
    
    if (!etherealMsg) {
      console.warn('[useStreaming] Finalize called but no ethereal message');
      return false;
    }
    
    if (!etherealMsg.content.trim()) {
      console.warn('[useStreaming] Finalize called but message is empty');
      cancel(); // Clear empty message
      return false;
    }
    
    const currentChatId = chatIdRef.current;
    if (!currentChatId) {
      console.error('[useStreaming] Cannot persist: no chat ID');
      return false;
    }
    
    // Determine if bot message
    const speaker = currentSpeakers.get(etherealMsg.speakerId);
    const isBot = speaker ? !speaker.is_user : true;
    
    try {
      await addMessageRef.current(
        etherealMsg.parentId,
        etherealMsg.content,
        etherealMsg.speakerId,
        isBot,
        etherealMsg.startedAt  // Pass the actual start time for accurate timestamps
      );
      
      // Only clear ethereal AFTER mutation succeeds and cache is updated
      // Small delay to let React render the new persistent message first
      requestAnimationFrame(() => {
        useStreamingStore.getState().cancel();
      });
      
      console.log('[useStreaming] ✅ Persisted to server');
      return true;
    } catch (err) {
      console.error('[useStreaming] ❌ Failed to persist:', err);
      cancel(); // Clear on error
      return false;
    }
  }, []);
  
  const cancel = useCallback((): void => {
    useStreamingStore.getState().cancel();
    console.log('[useStreaming] Cancelled');
  }, []);
  
  return {
    isStreaming,
    content: ethereal?.content ?? '',
    speaker: currentSpeaker,
    start,
    append,
    setContent,
    finalize,
    cancel,
  };
}
