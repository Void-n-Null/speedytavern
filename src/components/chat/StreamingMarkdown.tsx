import { useEffect, useState, useRef, memo } from 'react';
import type { CSSProperties } from 'react';
import { Streamdown } from 'streamdown';
import { subscribeToContent, getStreamingContent } from '../../store/streamingStore';
import { normalizeFencedCodeBlocks } from '../../utils/streamingMarkdown';

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

function analyzeFences(raw: string) {
  const fenceCount = (raw.match(/```/g) || []).length;
  return {
    fenceCount,
    hasFence: fenceCount > 0,
    openFenceOnOwnLine: /\n```/.test(raw),
    closeFenceOnOwnLine: /\n```\s*$/.test(raw),
    lastFenceIndex: raw.lastIndexOf('```'),
  };
}

function unwrapMdQuotes(element: HTMLElement) {
  const spans = Array.from(element.querySelectorAll('span.md-quote'));
  for (const span of spans) {
    const text = span.textContent ?? '';
    span.replaceWith(document.createTextNode(text));
  }
}

/**
 * Wrap "quoted text" in spans for styling.
 * Runs on the DOM after Streamdown renders.
 */
function wrapQuotesInElement(element: HTMLElement) {
  // We want quote highlighting to work even while streaming, where the opening
  // and closing quotes may end up in different text nodes. So we wrap across
  // TEXT nodes, maintaining state as we walk.
  const hasAnyQuote = (s: string) => /["“”]/.test(s);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    // Skip if already inside a md-quote span
    if (parent.classList.contains('md-quote')) continue;
    // Skip code blocks/inline code
    if (parent.closest('pre, code')) continue;
    textNodes.push(node);
  }

  let inQuote = false;

  for (const node of textNodes) {
    const text = node.textContent ?? '';
    if (!text) continue;
    if (!hasAnyQuote(text) && !inQuote) continue;

    const frag = document.createDocumentFragment();
    let localInQuote: boolean = inQuote;

    let buffer = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const isQuoteChar = ch === '"' || ch === '“' || ch === '”';
      if (!isQuoteChar) {
        buffer += ch;
        continue;
      }

      // Flush accumulated buffer before handling quote delimiter
      if (buffer) {
        if (localInQuote) {
          const span = document.createElement('span');
          span.className = 'md-quote';
          span.textContent = buffer;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(buffer));
        }
        buffer = '';
      }

      // Append the quote delimiter itself as highlighted
      const q = document.createElement('span');
      q.className = 'md-quote';
      q.textContent = ch;
      frag.appendChild(q);

      // Toggle quote state
      localInQuote = !localInQuote;
    }

    // Flush tail buffer
    if (buffer) {
      if (localInQuote) {
        const span = document.createElement('span');
        span.className = 'md-quote';
        span.textContent = buffer;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(buffer));
      }
    }

    inQuote = localInQuote;
    node.parentNode?.replaceChild(frag, node);
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
      // #region agent log (hypothesis A/B)
      const a = analyzeFences(raw);
      fetch('http://127.0.0.1:7242/ingest/d54406b6-69ad-486f-a813-cd243ee8a1af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:(a.hasFence?'A':'B'),location:'src/components/chat/StreamingMarkdown.tsx:79',message:'streaming raw update',data:{len:raw.length,...a,tail:raw.slice(-40)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
    const el = containerRef.current;
    const apply = () => {
      // Fast bail-out: no quotes, nothing to do.
      if (!/["“”]/.test(content)) return;
      unwrapMdQuotes(el);
      wrapQuotesInElement(el);
    };

    // Apply once for this content value.
    apply();

    // Streamdown may mutate DOM after mount/update (internal async work).
    // Observe and re-apply quote wrapping whenever the subtree changes.
    const observer = new MutationObserver(() => {
      observer.disconnect();
      apply();
      observer.observe(el, { childList: true, subtree: true, characterData: true });
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [content]);

  return (
    <div ref={containerRef} className={className} style={style}>
      <Streamdown>{optimisticallyCloseQuotes(normalizeFencedCodeBlocks(content))}</Streamdown>
    </div>
  );
});
