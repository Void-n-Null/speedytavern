import { create } from 'zustand';

/**
 * Ethereal streaming message - exists only during streaming, not in chat store.
 * This is rendered as a virtual node at the tail of the active path.
 */
export interface EtherealMessage {
  parentId: string;
  speakerId: string;
  content: string;
  startedAt: number;
}

interface StreamingStore {
  // State - the ethereal message (null when not streaming)
  ethereal: EtherealMessage | null;
  
  // Computed
  isStreaming: boolean;
  
  // Actions
  start: (parentId: string, speakerId: string) => void;
  append: (chunk: string) => void;
  setContent: (content: string) => void;
  finalize: () => EtherealMessage | null;
  cancel: () => void;
}

/**
 * Streaming store with ethereal messages.
 * 
 * Design principles:
 * - Ethereal messages exist ONLY here, not in chat store
 * - Chat store remains clean - only persisted messages
 * - UI renders ethereal message as virtual node at tail
 * - On finalize, caller handles persistence (server API)
 * - Minimal state = minimal re-renders
 * 
 * Usage:
 *   const { start, append, finalize } = useStreamingStore.getState();
 *   start(parentId, speakerId);
 *   append('Hello ');
 *   append('world!');
 *   const msg = finalize(); // Returns ethereal message for persistence
 *   await serverApi.addMessage(msg.parentId, msg.content, msg.speakerId, true);
 */
export const useStreamingStore = create<StreamingStore>((set, get) => ({
  ethereal: null,
  
  // Computed getter
  get isStreaming() {
    return get().ethereal !== null;
  },

  start: (parentId, speakerId) => {
    set({
      ethereal: {
        parentId,
        speakerId,
        content: '',
        startedAt: Date.now(),
      },
    });
  },

  append: (chunk) => {
    set((state) => {
      if (!state.ethereal) return state;
      return {
        ethereal: {
          ...state.ethereal,
          content: state.ethereal.content + chunk,
        },
      };
    });
  },

  setContent: (content) => {
    set((state) => {
      if (!state.ethereal) return state;
      return {
        ethereal: {
          ...state.ethereal,
          content,
        },
      };
    });
  },

  finalize: () => {
    const { ethereal } = get();
    set({ ethereal: null });
    return ethereal; // Return for caller to persist
  },

  cancel: () => {
    set({ ethereal: null });
  },
}));

// ============ Selector Hooks (minimal re-renders) ============

/**
 * Subscribe to streaming state changes.
 * Only re-renders when isStreaming changes.
 */
export function useIsStreaming(): boolean {
  return useStreamingStore((state) => state.ethereal !== null);
}

/**
 * Get the ethereal message if streaming.
 * Re-renders when ethereal changes.
 */
export function useEtherealMessage(): EtherealMessage | null {
  return useStreamingStore((state) => state.ethereal);
}

/**
 * Get streaming content for a specific node ID.
 * Returns content only if this node is the ethereal streaming node.
 * Returns null if not streaming or if streaming a different node.
 * 
 * For ethereal messages, use nodeId '__ethereal__'.
 */
export function useStreamingContent(nodeId: string): string | null {
  return useStreamingStore((state) => {
    // Ethereal messages have special ID '__ethereal__'
    if (nodeId === '__ethereal__' && state.ethereal) {
      return state.ethereal.content;
    }
    // Regular nodes - never streaming with new ethereal approach
    return null;
  });
}

/**
 * Check if we're streaming as a child of a specific parent.
 * Useful for knowing where to render the ethereal message.
 */
export function useIsStreamingAfter(parentId: string): boolean {
  return useStreamingStore((state) => state.ethereal?.parentId === parentId);
}
