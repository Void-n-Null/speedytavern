import { create } from 'zustand';
import { createStreamingParser, type StreamingParser } from '../utils/streamingMarkdown';

/**
 * Ethereal streaming message metadata.
 * Content is stored separately in refs to avoid re-renders on every chunk.
 */
export interface EtherealMeta {
  parentId: string;
  speakerId: string;
  startedAt: number;
}

/**
 * Full ethereal message (for finalization/persistence).
 */
export interface EtherealMessage extends EtherealMeta {
  content: string;
}

// ============ Ref-based content storage (no React re-renders) ============

/** Raw content buffer - updated on every append, no re-renders */
let contentBuffer = '';

/** Streaming markdown parser instance */
let parser: StreamingParser | null = null;

/** Listeners for content updates (DOM refs subscribe here) */
type ContentListener = (html: string, raw: string) => void;
const contentListeners = new Set<ContentListener>();

/** Subscribe to content updates (for ref-based DOM updates) */
export function subscribeToContent(listener: ContentListener): () => void {
  contentListeners.add(listener);
  return () => contentListeners.delete(listener);
}

/** Notify all listeners of content update */
function notifyContentListeners() {
  const html = parser?.getFullHtml() ?? contentBuffer;
  contentListeners.forEach(listener => listener(html, contentBuffer));
}

/** Get current raw content (for persistence) */
export function getStreamingContent(): string {
  return contentBuffer;
}

/** Get current HTML content */
export function getStreamingHtml(): string {
  return parser?.getFullHtml() ?? contentBuffer;
}

// ============ Zustand store (minimal state, only triggers renders on start/stop) ============

interface StreamingStore {
  // State - only metadata, content is in refs
  meta: EtherealMeta | null;
  
  // Version counter - incremented on each content update for useSyncExternalStore compatibility
  contentVersion: number;
  
  // Actions
  start: (parentId: string, speakerId: string) => void;
  append: (chunk: string) => void;
  setContent: (content: string) => void;
  finalize: () => EtherealMessage | null;
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

  start: (parentId, speakerId) => {
    // Reset content buffer and parser
    contentBuffer = '';
    parser = createStreamingParser();
    
    // Set metadata (triggers re-render for components watching meta)
    set({
      meta: {
        parentId,
        speakerId,
        startedAt: Date.now(),
      },
      contentVersion: 0,
    });
  },

  append: (chunk) => {
    if (!get().meta) return;
    
    // Update buffer (no re-render)
    contentBuffer += chunk;
    parser?.append(chunk);
    
    // Increment version for external store compatibility
    set(state => ({ contentVersion: state.contentVersion + 1 }));
    
    // Notify DOM listeners (ref-based updates)
    notifyContentListeners();
  },

  setContent: (content) => {
    if (!get().meta) return;
    
    // Reset buffer and parser with new content
    contentBuffer = content;
    parser?.reset();
    parser?.append(content);
    
    set(state => ({ contentVersion: state.contentVersion + 1 }));
    notifyContentListeners();
  },

  finalize: () => {
    const { meta } = get();
    if (!meta) return null;
    
    // Finalize parser
    parser?.finalize();
    
    // Capture full message
    const message: EtherealMessage = {
      ...meta,
      content: contentBuffer,
    };
    
    // Clear state
    contentBuffer = '';
    parser = null;
    set({ meta: null, contentVersion: 0 });
    
    return message;
  },

  cancel: () => {
    contentBuffer = '';
    parser = null;
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
 * Get ethereal metadata if streaming.
 * Re-renders only when streaming starts/stops.
 */
export function useEtherealMeta(): EtherealMeta | null {
  return useStreamingStore((state) => state.meta);
}

/**
 * Get the full ethereal message (meta + current content) if streaming.
 * NOTE: This reads content from the ref, so it won't trigger re-renders on content change.
 * Use subscribeToContent() for real-time DOM updates.
 */
export function useEtherealMessage(): EtherealMessage | null {
  const meta = useStreamingStore((state) => state.meta);
  if (!meta) return null;
  return { ...meta, content: contentBuffer };
}

/**
 * Check if we're streaming as a child of a specific parent.
 * Useful for knowing where to render the ethereal message.
 */
export function useIsStreamingAfter(parentId: string): boolean {
  return useStreamingStore((state) => state.meta?.parentId === parentId);
}
