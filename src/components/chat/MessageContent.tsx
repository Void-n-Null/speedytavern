import { memo, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTypographyConfig, useEditConfig } from '../../hooks/queries/useProfiles';
import { fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';
import { Streamdown } from 'streamdown';
import { normalizeFencedCodeBlocks } from '../../utils/streamingMarkdown';

interface MessageContentProps {
  nodeId: string;
  content: string;
  isBot: boolean;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content with markdown support.
 * 
 * For static (non-streaming) messages only.
 * Streaming messages use StreamingMarkdown component for ref-based updates.
 */
export const MessageContent = memo(function MessageContent({
  nodeId: _nodeId,
  content,
  isBot,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  const typography = useTypographyConfig();
  const editConfig = useEditConfig();

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Optimistically close unclosed quotes in raw markdown.
   * If we see an opening " without a closing ", add one at the end.
   */
  const displayContent = useMemo(() => {
    const normalized = normalizeFencedCodeBlocks(content);
    const quoteCount = (normalized.match(/"/g) || []).length;
    return quoteCount % 2 !== 0 ? normalized + '"' : normalized;
  }, [content]);

  function unwrapMdQuotes(element: HTMLElement) {
    const spans = Array.from(element.querySelectorAll('span.md-quote'));
    for (const span of spans) {
      const text = span.textContent ?? '';
      span.replaceWith(document.createTextNode(text));
    }
  }

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

  // Wrap "quoted text" in spans for styling (DOM pass, like streaming).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      if (!/["“”]/.test(displayContent)) return;
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
  }, [displayContent]);

  // Compute text color based on message type
  const textColor = useMemo(() => {
    if (isBot && typography.botTextColor) {
      return typography.botTextColor;
    }
    if (!isBot && typography.userTextColor) {
      return typography.userTextColor;
    }
    return typography.textColor;
  }, [isBot, typography.textColor, typography.botTextColor, typography.userTextColor]);

  // Content styles
  const contentStyle = useMemo((): CSSProperties => ({
    fontSize: typography.fontSize === 'custom' 
      ? `${typography.customFontSizePx}px` 
      : fontSizeMap[typography.fontSize],
    lineHeight: lineHeightMap[typography.lineHeight],
    fontFamily: fontFamilyMap[typography.fontFamily],
    fontWeight: fontWeightMap[typography.fontWeight],
    color: textColor,
  }), [typography.fontSize, typography.customFontSizePx, typography.lineHeight, typography.fontFamily, typography.fontWeight, textColor]);

  // Edit textarea styles
  const editStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      ...contentStyle,
      width: '100%',
      resize: 'vertical',
      minHeight: '60px',
    };
    
    if (editConfig.style === 'fullwidth') {
      base.minHeight = '120px';
    }
    
    return base;
  }, [contentStyle, editConfig.style]);

  // Suppress unused variable warning - kept for API consistency
  void _nodeId;

  if (isEditing) {
    return (
      <textarea
        className="message-content-edit"
        style={editStyle}
        value={content}
        onChange={(e) => onEditChange?.(e.target.value)}
        autoFocus
      />
    );
  }

  return (
    <div ref={containerRef} className="message-content" style={contentStyle}>
      <Streamdown>{displayContent}</Streamdown>
    </div>
  );
});
