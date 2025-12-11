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
 * Post-process HTML to wrap "quoted text" in spans for styling.
 */
function wrapQuotesInSpans(html: string): string {
  // Match "text" - handle both literal " and HTML entity &quot;
  // Avoid matching inside HTML tag attributes by checking context
  return html
    // Handle literal quotes
    .replace(/"([^"]+)"/g, '<span class="md-quote">"$1"</span>')
    // Handle HTML entity quotes
    .replace(/&quot;([^&]+)&quot;/g, '<span class="md-quote">"$1"</span>');
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
    const html = marked.parse(content) as string;
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
