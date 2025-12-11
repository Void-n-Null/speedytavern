import { useEffect, useState, useRef, memo } from 'react';
import type { CSSProperties } from 'react';
import { Streamdown } from 'streamdown';
import { subscribeToContent, getStreamingContent } from '../../store/streamingStore';

interface StreamingMarkdownProps {
  /** Custom styles for the content container */
  style?: CSSProperties;
  /** Additional class name */
  className?: string;
}

/**
 * Optimistically close unclosed quotes in raw markdown.
 * If we see an opening " without a closing ", add one at the end.
 */
function optimisticallyCloseQuotes(content: string): string {
  const quoteCount = (content.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    return content + '"';
  }
  return content;
}

/**
 * Wrap "quoted text" in spans for styling.
 * Runs on the DOM after Streamdown renders.
 */
function wrapQuotesInElement(element: HTMLElement) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    // Skip if already inside a md-quote span
    if (node.parentElement?.classList.contains('md-quote')) continue;
    textNodes.push(node);
  }
  
  for (const node of textNodes) {
    const text = node.textContent || '';
    // Match "quoted text" patterns
    if (text.includes('"') && /"[^"]+"/g.test(text)) {
      const replaced = text.replace(/"([^"]+)"/g, '<span class="md-quote">"$1"</span>');
      if (replaced !== text) {
        const span = document.createElement('span');
        span.innerHTML = replaced;
        node.parentNode?.replaceChild(span, node);
      }
    }
  }
}

/**
 * Streaming markdown renderer using Streamdown.
 * 
 * Streamdown handles incomplete markdown gracefully - auto-closing
 * unterminated bold, italic, code, links, and headings.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  style,
  className,
}: StreamingMarkdownProps) {
  // Keep React state so Streamdown can render incomplete markdown correctly,
  // but throttle updates to at most once per animation frame.
  const [content, setContent] = useState(() => getStreamingContent());
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRawRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Subscribe to raw content updates
    const unsubscribe = subscribeToContent((_html, raw) => {
      // Coalesce setState to one per frame; streaming can be character-by-character.
      pendingRawRef.current = raw;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const nextRaw = pendingRawRef.current;
          pendingRawRef.current = null;
          if (nextRaw == null) return;
          setContent(nextRaw);
        });
      }
    });

    return unsubscribe;
  }, []);

  // Wrap quotes after Streamdown updates the DOM (throttled by store + rAF setState).
  useEffect(() => {
    if (!containerRef.current) return;
    // Fast bail-out: no quotes, nothing to do.
    if (!content.includes('"')) return;
    wrapQuotesInElement(containerRef.current);
  }, [content]);

  return (
    <div ref={containerRef} className={className} style={style}>
      <Streamdown>{optimisticallyCloseQuotes(content)}</Streamdown>
    </div>
  );
});
