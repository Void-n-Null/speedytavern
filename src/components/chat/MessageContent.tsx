import { memo, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useTypographyConfig, useEditConfig } from '../../hooks/queries/useProfiles';
import { fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';
import { Streamdown } from 'streamdown';
import { formatStreamdownInput } from './streamdown/formatStreamdownInput';
import { useRafCoalescedStreamingRaw } from './streamdown/useRafCoalescedStreamingRaw';
import { useStreamdownQuoteWrapping } from './streamdown/useStreamdownQuoteWrapping';

interface MessageContentProps {
  nodeId: string;
  content: string;
  isBot: boolean;
  /** If true, render live streaming markdown from the streaming store buffer */
  isStreaming?: boolean;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content with markdown support.
 * 
 * Streaming messages subscribe to the streaming store buffer and render via
 * the same DOM container as static messages. This avoids a streaming->static
 * remount on finalize, which can cause scroll jumps when the message is tall.
 */
export const MessageContent = memo(function MessageContent({
  nodeId: _nodeId,
  content,
  isBot,
  isStreaming = false,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  const typography = useTypographyConfig();
  const editConfig = useEditConfig();

  const containerRef = useRef<HTMLDivElement>(null);
  const streamingRaw = useRafCoalescedStreamingRaw(isStreaming);

  /**
   * Optimistically close unclosed quotes in raw markdown.
   * If we see an opening " without a closing ", add one at the end.
   */
  const displayContent = useMemo(() => {
    const raw = isStreaming ? streamingRaw : content;
    return formatStreamdownInput(raw);
  }, [content, isStreaming, streamingRaw]);
  useStreamdownQuoteWrapping(containerRef, displayContent);

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

  if (isStreaming) {
    return (
      <div ref={containerRef} className="message-content streaming" style={contentStyle}>
        <Streamdown>{displayContent}</Streamdown>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="message-content" style={contentStyle}>
      <Streamdown>{displayContent}</Streamdown>
    </div>
  );
});
