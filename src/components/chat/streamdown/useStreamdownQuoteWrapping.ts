import type { RefObject } from 'react';
import { useEffect } from 'react';

function unwrapMdQuotes(element: HTMLElement) {
  const spans = Array.from(element.querySelectorAll('span.md-quote'));
  for (const span of spans) {
    const text = span.textContent ?? '';
    span.replaceWith(document.createTextNode(text));
  }
}

/**
 * Wrap quoted text in spans for styling.
 *
 * Designed to work with Streamdown output where the opening and closing quotes
 * may end up in different text nodes (especially while streaming).
 */
function wrapQuotesInElement(element: HTMLElement) {
  const hasAnyQuote = (s: string) => /["“”]/.test(s);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.classList.contains('md-quote')) continue;
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

      const q = document.createElement('span');
      q.className = 'md-quote';
      q.textContent = ch;
      frag.appendChild(q);
      localInQuote = !localInQuote;
    }

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
 * Apply quote wrapping to Streamdown-rendered DOM.
 *
 * We apply once per content change, then also observe DOM mutations because
 * Streamdown may update the subtree asynchronously.
 */
export function useStreamdownQuoteWrapping(
  containerRef: RefObject<HTMLElement | null>,
  contentKey: string
): void {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = () => {
      if (!/["“”]/.test(contentKey)) return;
      unwrapMdQuotes(el);
      wrapQuotesInElement(el);
    };

    apply();

    const observer = new MutationObserver(() => {
      observer.disconnect();
      apply();
      observer.observe(el, { childList: true, subtree: true, characterData: true });
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [containerRef, contentKey]);
}

