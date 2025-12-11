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
        const text =
          "\"Dear Princess Celestia,\"\n\n" +
          "`Today, I learned that everypony deserves a chance to be their best self.`\n\n" +
          "*It's important to remember that kindness and understanding can overcome any challenge.*\n\n" +
          "**Please consider this a gentle reminder that we are all capable of growth and change.**\n\n" +
          "```ts\n" +
          "// Big bad codeblock\n" +
          "if (condition) {\n" +
          "  this;\n" +
          "} else {\n" +
          "  that;\n" +
          "}\n" +
          "```\n";
        // #region agent log (hypothesis A)
        fetch('http://127.0.0.1:7242/ingest/d54406b6-69ad-486f-a813-cd243ee8a1af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:'A',location:'src/hooks/useStreamingDemo.ts:36',message:'demo streaming text prepared',data:{len:text.length,fenceCount:(text.match(/```/g)||[]).length,openFenceOnOwnLine:/\n```/.test(text),closeFenceOnOwnLine:/\n```\s*$/.test(text),tail:text.slice(-40)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
