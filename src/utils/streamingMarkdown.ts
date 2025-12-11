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
 * Creates a streaming markdown parser instance.
 * Used by the streaming store to track raw content.
 */
export function createStreamingParser() {
  let buffer = '';

  return {
    /** Append content */
    append(chunk: string): void {
      buffer += chunk;
    },

    /** Get current full HTML (parsed with marked) */
    getFullHtml(): string {
      try {
        return marked.parse(buffer) as string;
      } catch {
        return buffer;
      }
    },

    /** Get raw content (for persistence and Streamdown) */
    getRawContent(): string {
      return buffer;
    },

    /** Reset parser state */
    reset(): void {
      buffer = '';
    },

    /** Finalize - just returns empty, content is persisted via getRawContent */
    finalize(): string {
      const content = buffer;
      buffer = '';
      return content;
    },
  };
}

export type StreamingParser = ReturnType<typeof createStreamingParser>;

/**
 * Parse complete markdown string to HTML.
 * Use this for static content (non-streaming).
 */
export function parseMarkdown(content: string): string {
  try {
    const normalized = normalizeFencedCodeBlocks(content);
    const html = marked.parse(normalized) as string;
    const result = wrapQuotesInSpans(html);
    // #region agent log (hypothesis A/C)
    if (content.includes('```') || result.includes('<pre')) {
      fetch('http://127.0.0.1:7242/ingest/d54406b6-69ad-486f-a813-cd243ee8a1af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre',hypothesisId:(content.includes('```')?'A':'C'),location:'src/utils/streamingMarkdown.ts:86',message:'static parseMarkdown',data:{len:content.length,fenceCount:(content.match(/```/g)||[]).length,htmlHasPre:html.includes('<pre'),resultHasPre:result.includes('<pre'),tail:content.slice(-40)},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    // #region agent log (hypothesis A - post)
    if (content.includes('```') || result.includes('<pre')) {
      fetch('http://127.0.0.1:7242/ingest/d54406b6-69ad-486f-a813-cd243ee8a1af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post',hypothesisId:'A',location:'src/utils/streamingMarkdown.ts:parseMarkdown',message:'static parseMarkdown after normalization',data:{origLen:content.length,normLen:normalized.length,origFenceCount:(content.match(/```/g)||[]).length,normFenceCount:(normalized.match(/```/g)||[]).length,htmlHasPre:html.includes('<pre'),resultHasPre:result.includes('<pre')},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    // #region agent log (hypothesis D)
    if (content.includes('```') || result.includes('<pre')) {
      const counts = {
        pre: (result.match(/<pre\b/g) || []).length,
        code: (result.match(/<code\b/g) || []).length,
        p: (result.match(/<p\b/g) || []).length,
        br: (result.match(/<br\b/g) || []).length,
        blockquote: (result.match(/<blockquote\b/g) || []).length,
        em: (result.match(/<em\b/g) || []).length,
        strong: (result.match(/<strong\b/g) || []).length,
      };
      fetch('http://127.0.0.1:7242/ingest/d54406b6-69ad-486f-a813-cd243ee8a1af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'diff',hypothesisId:'D',location:'src/utils/streamingMarkdown.ts:parseMarkdown',message:'static html summary',data:{changedByNormalize:normalized!==content,counts,htmlHead:result.slice(0,200),htmlTail:result.slice(-200)},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    // Debug: check if quotes are being wrapped
    if (content.includes('"') && !result.includes('md-quote')) {
      console.log('[parseMarkdown] Quote wrapping failed:', { content, html, result });
    }
    return result;
  } catch {
    return content;
  }
}
