import { useEffect, useRef } from 'react';
import { useStreamingStore } from '../store/streamingStore';
import { useStreaming } from './useStreaming';

/**
 * Demo hook for testing streaming functionality.
 * 
 * Keyboard shortcuts:
 * - S: Start streaming a bot message
 * - Enter: Finalize and persist to server
 * - Escape: Cancel streaming
 * 
 * Uses the high-level useStreaming API.
 */
export function useStreamingDemo() {
  const streaming = useStreaming();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check current streaming state directly from store
      const currentlyStreaming = useStreamingStore.getState().meta !== null;
      
      // 'S' to start streaming
      if (e.key === 's' && !currentlyStreaming && !e.ctrlKey && !e.metaKey) {
        const started = streaming.start({ speaker: 'bot' });
        if (!started) return;
        
        // Simulate streaming tokens
        const text = "\"Dear Princess Celestia,\" `Today, I learned that everypony deserves a chance to be their best self.` *It's important to remember that kindness and understanding can overcome any challenge.* **Please consider this a gentle reminder that we are all capable of growth and change.**";
        let index = 0;
        
        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        intervalRef.current = setInterval(() => {
          if (index < text.length) {
            streaming.append(text[index]);
            index++;
          } else {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }, 30);
      }
      
      // Enter to finalize and persist
      if (e.key === 'Enter' && currentlyStreaming) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        await streaming.finalize();
      }
      
      // Escape to cancel
      if (e.key === 'Escape' && currentlyStreaming) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        streaming.cancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [streaming]);
  
  // Cleanup interval on unmount only
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isStreaming: streaming.isStreaming };
}
