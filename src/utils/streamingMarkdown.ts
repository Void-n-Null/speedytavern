import { marked } from 'marked';

/**
 * Streaming markdown parser.
 * 
 * Handles incremental markdown input with smart boundary detection
 * to avoid rendering broken markdown (e.g., incomplete code blocks).
 * 
 * Architecture:
 * - Maintains a buffer of unparsed content
 * - Only parses "safe" prefixes where markdown is complete
 * - Returns HTML for the complete portion
 */

// Configure marked for performance
marked.use({
  async: false,
  gfm: true,
  breaks: true,
});

/**
 * Detects if markdown is at a "safe" boundary for parsing.
 * Returns the index up to which we can safely parse.
 */
function findSafeBoundary(content: string): number {
  // Check for unclosed code blocks (``` or `)
  const tripleBackticks = (content.match(/```/g) || []).length;
  if (tripleBackticks % 2 !== 0) {
    // Find last complete code block
    const lastClose = content.lastIndexOf('```');
    const beforeLast = content.lastIndexOf('```', lastClose - 1);
    if (beforeLast !== -1) {
      return beforeLast + 3; // Include the closing ```
    }
    return 0; // No complete code block yet
  }

  // Check for incomplete inline code
  const singleBackticks = (content.match(/(?<!`)`(?!`)/g) || []).length;
  if (singleBackticks % 2 !== 0) {
    const lastBacktick = content.lastIndexOf('`');
    return lastBacktick > 0 ? lastBacktick : 0;
  }

  // Check for incomplete bold/italic at end of string
  // If we end with * or _ that might be starting formatting, wait for more
  const trimmed = content.trimEnd();
  if (trimmed.endsWith('*') || trimmed.endsWith('_')) {
    // Check if it's likely starting formatting vs ending
    const lastNewline = content.lastIndexOf('\n');
    return lastNewline > 0 ? lastNewline : content.length;
  }

  return content.length;
}

/**
 * Creates a streaming markdown parser instance.
 * 
 * @example
 * ```ts
 * const parser = createStreamingParser();
 * parser.append('Hello **world');      // Returns 'Hello '
 * parser.append('**!');                // Returns '<strong>world</strong>!'
 * const final = parser.finalize();     // Returns any remaining content
 * ```
 */
export function createStreamingParser() {
  let buffer = '';
  let parsedUpTo = 0;

  return {
    /**
     * Append content and get HTML for newly parseable portion.
     */
    append(chunk: string): string {
      buffer += chunk;
      
      const safeBoundary = findSafeBoundary(buffer);
      if (safeBoundary <= parsedUpTo) {
        return ''; // Nothing new to parse
      }

      const toParse = buffer.slice(parsedUpTo, safeBoundary);
      parsedUpTo = safeBoundary;

      try {
        return marked.parse(toParse) as string;
      } catch {
        return toParse; // Fallback to raw text on error
      }
    },

    /**
     * Get current full HTML (for replacing, not appending).
     */
    getFullHtml(): string {
      try {
        return marked.parse(buffer) as string;
      } catch {
        return buffer;
      }
    },

    /**
     * Finalize and get any remaining unparsed content as HTML.
     */
    finalize(): string {
      const remaining = buffer.slice(parsedUpTo);
      buffer = '';
      parsedUpTo = 0;

      if (!remaining) return '';

      try {
        return marked.parse(remaining) as string;
      } catch {
        return remaining;
      }
    },

    /**
     * Get raw content (for persistence).
     */
    getRawContent(): string {
      return buffer;
    },

    /**
     * Reset parser state.
     */
    reset(): void {
      buffer = '';
      parsedUpTo = 0;
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
    return marked.parse(content) as string;
  } catch {
    return content;
  }
}
