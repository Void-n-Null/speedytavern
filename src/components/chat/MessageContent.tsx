import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTypographyConfig, useEditConfig } from '../../store/messageStyleStore';
import { fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';
import { parseMarkdown } from '../../utils/streamingMarkdown';

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
  
  // Parse markdown for static content (memoized)
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

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
    fontSize: fontSizeMap[typography.fontSize],
    lineHeight: lineHeightMap[typography.lineHeight],
    fontFamily: fontFamilyMap[typography.fontFamily],
    fontWeight: fontWeightMap[typography.fontWeight],
    color: textColor,
  }), [typography.fontSize, typography.lineHeight, typography.fontFamily, typography.fontWeight, textColor]);

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
    <div 
      className="message-content" 
      style={contentStyle}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
});
