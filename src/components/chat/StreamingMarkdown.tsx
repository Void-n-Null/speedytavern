import { useEffect, useRef, memo } from 'react';
import type { CSSProperties } from 'react';
import { subscribeToContent, getStreamingHtml } from '../../store/streamingStore';

interface StreamingMarkdownProps {
  /** Custom styles for the content container */
  style?: CSSProperties;
  /** Additional class name */
  className?: string;
}

/**
 * Ref-based streaming markdown renderer.
 * 
 * Performance optimizations:
 * - NO React re-renders on content updates
 * - Direct DOM manipulation via innerHTML
 * - Subscribes to content updates outside React
 * - Only re-renders on mount/unmount
 * 
 * The markdown is parsed incrementally by the streaming store's parser.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  style,
  className,
}: StreamingMarkdownProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set initial content
    if (contentRef.current) {
      contentRef.current.innerHTML = getStreamingHtml();
    }

    // Subscribe to content updates (bypasses React entirely)
    const unsubscribe = subscribeToContent((html) => {
      if (contentRef.current) {
        contentRef.current.innerHTML = html;
      }
    });

    return unsubscribe;
  }, []);

  return (
    <div 
      ref={contentRef}
      className={className}
      style={style}
    />
  );
});
