import { normalizeFencedCodeBlocks } from '../../../utils/streamingMarkdown';

/**
 * Apply the same preprocessing that streaming/static message rendering expects:
 * - Normalize fenced code blocks (ensure fences start on their own line)
 * - Optimistically close unbalanced straight quotes (")
 *
 * Note: We intentionally only balance `"` (not smart quotes) to match current behavior.
 */
export function formatStreamdownInput(raw: string): string {
  const normalized = normalizeFencedCodeBlocks(raw);
  const quoteCount = (normalized.match(/"/g) || []).length;
  return quoteCount % 2 !== 0 ? normalized + '"' : normalized;
}

