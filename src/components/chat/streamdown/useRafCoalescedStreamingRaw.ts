import { useEffect, useRef, useState } from 'react';
import { getStreamingContent, subscribeToContent } from '../../../store/streamingStore';

/**
 * Subscribe to the global streaming buffer while `isStreaming` is true, and
 * update local state when the store flushes (store already coalesces to ~1/frame).
 */
export function useRafCoalescedStreamingRaw(isStreaming: boolean): string {
  const [streamingRaw, setStreamingRaw] = useState(() => (isStreaming ? getStreamingContent() : ''));
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!isStreaming) {
      setStreamingRaw('');
      return;
    }

    // Initialize from current buffer (in case we mounted mid-stream).
    setStreamingRaw(getStreamingContent());

    const unsubscribe = subscribeToContent((raw) => {
      if (!isMountedRef.current) return;
      setStreamingRaw(raw);
    });

    return () => {
      unsubscribe();
    };
  }, [isStreaming]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return streamingRaw;
}

