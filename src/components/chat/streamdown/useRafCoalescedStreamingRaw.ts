import { useEffect, useRef, useState } from 'react';
import { getStreamingContent, subscribeToContent } from '../../../store/streamingStore';

type Scheduler = {
  schedule: (cb: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};

function getScheduler(): Scheduler {
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;

  const cancel =
    typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id: number) => clearTimeout(id);

  return { schedule, cancel };
}

/**
 * Subscribe to the global streaming buffer while `isStreaming` is true, and
 * coalesce state updates to at most once per animation frame.
 *
 * This intentionally mirrors the existing per-message streaming subscription
 * logic to preserve render/update behavior.
 */
export function useRafCoalescedStreamingRaw(isStreaming: boolean): string {
  const [streamingRaw, setStreamingRaw] = useState(() => (isStreaming ? getStreamingContent() : ''));

  const pendingRawRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const { schedule, cancel } = getScheduler();

    if (!isStreaming) {
      // Cleanup any scheduled work and avoid holding stale buffer.
      if (rafRef.current != null) {
        cancel(rafRef.current);
      }
      rafRef.current = null;
      pendingRawRef.current = null;
      setStreamingRaw('');
      return;
    }

    // Initialize from current buffer (in case we mounted mid-stream).
    setStreamingRaw(getStreamingContent());

    const unsubscribe = subscribeToContent((_html, raw) => {
      pendingRawRef.current = raw;
      if (rafRef.current == null) {
        rafRef.current = schedule(() => {
          rafRef.current = null;
          const nextRaw = pendingRawRef.current;
          pendingRawRef.current = null;
          if (nextRaw == null) return;
          setStreamingRaw(nextRaw);
        });
      }
    });

    return () => {
      unsubscribe();
      if (rafRef.current != null) {
        cancel(rafRef.current);
        rafRef.current = null;
      }
      pendingRawRef.current = null;
    };
  }, [isStreaming]);

  return streamingRaw;
}

