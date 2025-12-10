import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useStreamingContent } from '../../store/streamingStore';
import { useTypographyConfig, useEditConfig } from '../../store/messageStyleStore';
import { fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';

interface MessageContentProps {
  nodeId: string;
  content: string;
  isBot: boolean;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content.
 * Now fully customizable via messageStyleStore.
 * 
 * Streaming optimization:
 * - Subscribes to streaming store ONLY for its own nodeId
 * - When streaming, renders from streaming store (updates every chunk)
 * - When not streaming, renders from props (memoized)
 */
export const MessageContent = memo(function MessageContent({
  nodeId,
  content,
  isBot,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  const typography = useTypographyConfig();
  const editConfig = useEditConfig();
  
  // Only subscribes if this node is streaming - selector returns null otherwise
  const streamingContent = useStreamingContent(nodeId);
  
  // Use streaming content if available, otherwise use prop
  const displayContent = streamingContent ?? content;

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

  if (isEditing) {
    return (
      <textarea
        className="message-content-edit"
        style={editStyle}
        value={displayContent}
        onChange={(e) => onEditChange?.(e.target.value)}
        autoFocus
      />
    );
  }

  return (
    <div className="message-content" style={contentStyle}>
      {displayContent}
      {streamingContent !== null && <span className="streaming-cursor">▊</span>}
    </div>
  );
});
