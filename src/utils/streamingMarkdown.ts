import { Marked } from 'marked';

/**
 * Markdown utilities for static content.
 * 
 * For streaming content, use the Streamdown React component instead.
 * This is only used for non-streaming (persisted) messages.
 */

// Create a dedicated marked instance configured for sync parsing
const marked = new Marked({
  async: false,
  gfm: true,
  breaks: true,
});

/**
 * Best-effort normalization for fenced code blocks.
 *
 * CommonMark/GFM require fences to begin at the start of a line, but users
 * (and our demo) sometimes write inline fences like: `text ```code````.
 *
 * This inserts a newline before any ``` that isn't already at the start of a line.
 */
export function normalizeFencedCodeBlocks(md: string): string {
  return md.replace(/([^\n])```/g, '$1\n```');
}

/**
 * Post-process HTML to wrap "quoted text" in spans for styling.
 */
function wrapQuotesInSpans(html: string): string {
  // IMPORTANT: Do NOT regex-rewrite raw HTML. It can corrupt attributes like
  // <code class="language-ts"> by inserting spans inside the attribute value.
  //
  // Instead, parse the HTML and rewrite only TEXT nodes.
  if (typeof DOMParser === 'undefined') return html;

  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstElementChild as HTMLElement | null;
    if (!container) return html;

    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent) continue;
      // Never wrap quotes inside code blocks / inline code.
      if (parent.closest('pre, code')) continue;
      // Skip if already inside a md-quote span.
      if (parent.classList.contains('md-quote')) continue;
      textNodes.push(node);
    }

    for (const node of textNodes) {
      const text = node.textContent || '';
      if (!text.includes('"') || !/"[^"]+"/g.test(text)) continue;
      const replaced = text.replace(/"([^"]+)"/g, '<span class="md-quote">"$1"</span>');
      if (replaced === text) continue;

      const span = doc.createElement('span');
      span.innerHTML = replaced;
      node.parentNode?.replaceChild(span, node);
    }

    return container.innerHTML;
  } catch {
    return html;
  }
}

/**
 * Parse complete markdown string to HTML.
 * Use this for static content (non-streaming).
 */
export function parseMarkdown(content: string): string {
  try {
    const normalized = normalizeFencedCodeBlocks(content);
    const html = marked.parse(normalized) as string;
    const result = wrapQuotesInSpans(html);
    // Debug: check if quotes are being wrapped
    if (content.includes('"') && !result.includes('md-quote')) {
      console.log('[parseMarkdown] Quote wrapping failed:', { content, html, result });
    }
    return result;
  } catch {
    return content;
  }
}
