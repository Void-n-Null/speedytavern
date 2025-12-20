type HastText = { type: 'text'; value: string };
type HastElement = {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};
type HastRoot = { type: 'root'; children?: HastNode[] };
type HastNode = HastText | HastElement | HastRoot | { type: string; [k: string]: unknown };

function isElement(node: HastNode): node is HastElement {
  return !!node && typeof node === 'object' && (node as any).type === 'element' && typeof (node as any).tagName === 'string';
}

function isText(node: HastNode): node is HastText {
  return !!node && typeof node === 'object' && (node as any).type === 'text' && typeof (node as any).value === 'string';
}

function makeQuoteSpan(text: string): HastElement {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['md-quote'] },
    children: [{ type: 'text', value: text }],
  };
}

const QUOTE_CHARS = new Set(['"', '“', '”']);

/**
 * Rehype plugin: wraps quoted text in `<span class="md-quote">…</span>`.
 *
 * This replaces the old MutationObserver + DOM mutation approach, which is
 * fragile with React and expensive during streaming.
 *
 * Behavior:
 * - Walks HAST text nodes in document order
 * - Toggles `inQuote` on any of: ", “, ”
 * - Wraps quote characters and quoted spans
 * - Skips nodes under <pre>/<code> and skips already wrapped spans
 */
export function rehypeQuoteWrap() {
  return (tree: HastNode) => {
    let inQuote = false;

    const visit = (node: HastNode, ancestors: HastElement[]) => {
      if (isElement(node)) {
        const tag = node.tagName.toLowerCase();
        // If already inside a quote span, don't recurse further.
        const className = node.properties?.className;
        const classList = Array.isArray(className) ? className : typeof className === 'string' ? className.split(/\s+/) : [];
        if (classList.includes('md-quote')) return;

        // Skip code/pre entirely.
        if (tag === 'code' || tag === 'pre') return;

        const kids = node.children ?? [];
        for (const child of kids) visit(child, [...ancestors, node]);
        return;
      }

      if (!isText(node)) return;

      // If any ancestor is code/pre, skip.
      for (const a of ancestors) {
        const tag = a.tagName.toLowerCase();
        if (tag === 'code' || tag === 'pre') return;
        // If an ancestor is a md-quote span, also skip.
        if (tag === 'span') {
          const cn = a.properties?.className;
          const cl = Array.isArray(cn) ? cn : typeof cn === 'string' ? cn.split(/\s+/) : [];
          if (cl.includes('md-quote')) return;
        }
      }

      const text = node.value;
      if (!text || !/["“”]/.test(text)) {
        // If we're currently inside a quote, still need to wrap entire text.
        if (!inQuote) return;
      }

      const parts: HastNode[] = [];
      let buf = '';

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const isQuote = QUOTE_CHARS.has(ch);

        if (!isQuote) {
          buf += ch;
          continue;
        }

        // Flush buffer.
        if (buf) {
          parts.push(inQuote ? makeQuoteSpan(buf) : ({ type: 'text', value: buf } as HastText));
          buf = '';
        }

        // Always wrap the quote character itself.
        parts.push(makeQuoteSpan(ch));
        inQuote = !inQuote;
      }

      if (buf) {
        parts.push(inQuote ? makeQuoteSpan(buf) : ({ type: 'text', value: buf } as HastText));
      }

      // Replace the node in its parent by mutating the parent's children array.
      const parent = ancestors[ancestors.length - 1];
      if (!parent?.children) return;
      const idx = parent.children.indexOf(node);
      if (idx === -1) return;
      parent.children.splice(idx, 1, ...parts);
    };

    if (isElement(tree)) {
      visit(tree, []);
    } else if (tree && typeof tree === 'object' && (tree as any).children && Array.isArray((tree as any).children)) {
      // Root
      const kids = (tree as any).children as HastNode[];
      for (const child of kids) visit(child, []);
    }
  };
}








