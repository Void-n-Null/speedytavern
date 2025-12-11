import { useMemo } from 'react';
import { useMarkdownConfig } from '../../hooks/queries/useProfiles';
import { fontWeightMap } from '../../types/messageStyle';
import type { HeadingSize } from '../../types/messageStyle';

// Heading size multipliers
const headingSizeMap: Record<HeadingSize, { h1: string; h2: string; h3: string }> = {
  sm: { h1: '1.3em', h2: '1.15em', h3: '1.05em' },
  md: { h1: '1.5em', h2: '1.3em', h3: '1.15em' },
  lg: { h1: '1.8em', h2: '1.5em', h3: '1.25em' },
  xl: { h1: '2.2em', h2: '1.8em', h3: '1.4em' },
};

/**
 * Injects dynamic CSS for markdown styling based on config.
 * Place this component once at the app root or message list level.
 */
export function MarkdownStyles() {
  const md = useMarkdownConfig();

  const cssContent = useMemo(() => {
    const sizes = headingSizeMap[md.headingSize] ?? headingSizeMap.md;
    
    return `
      /* Code Blocks */
      .message-content pre {
        background: ${md.codeBlockBackground};
        border-radius: ${md.codeBlockBorderRadius}px;
      }
      .message-content pre code {
        color: ${md.codeBlockTextColor};
      }
      
      /* Inline Code */
      .message-content code:not(pre code) {
        background: ${md.inlineCodeBackground};
        color: ${md.inlineCodeTextColor};
      }
      
      /* Blockquotes */
      .message-content blockquote {
        border-left-color: ${md.blockquoteBorderColor};
        background: ${md.blockquoteBackground};
        color: ${md.blockquoteTextColor};
      }
      
      /* Headings */
      .message-content h1,
      .message-content h2,
      .message-content h3,
      .message-content h4,
      .message-content h5,
      .message-content h6 {
        ${md.headingColor ? `color: ${md.headingColor};` : ''}
        font-weight: ${fontWeightMap[md.headingWeight]};
      }
      .message-content h1 { font-size: ${sizes.h1}; }
      .message-content h2 { font-size: ${sizes.h2}; }
      .message-content h3 { font-size: ${sizes.h3}; }
      
      /* Bold */
      .message-content strong,
      .message-content b {
        ${md.boldColor ? `color: ${md.boldColor};` : ''}
      }
      
      /* Italic */
      .message-content em,
      .message-content i {
        ${md.italicColor ? `color: ${md.italicColor};` : ''}
        ${md.italicStyle !== false ? 'font-style: italic;' : 'font-style: normal;'}
      }
      
      /* Quoted text ("...") */
      .message-content .md-quote {
        ${md.quoteColor ? `color: ${md.quoteColor};` : ''}
      }
      
      /* Links */
      .message-content a {
        color: ${md.linkColor};
        ${md.linkUnderline ? 'text-decoration: underline;' : 'text-decoration: none;'}
      }
      .message-content a:hover {
        opacity: 0.8;
      }
    `;
  }, [md]);

  return <style dangerouslySetInnerHTML={{ __html: cssContent }} />;
}
