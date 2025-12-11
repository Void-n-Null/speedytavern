import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useEtherealMeta } from '../../store/streamingStore';
import { useServerChat } from '../../hooks/queries';
import { useLayoutConfig, useTypographyConfig } from '../../hooks/queries/useProfiles';
import { gapMap, paddingMap, fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';
import { MessageMeta } from './MessageMeta';
import { StreamingMarkdown } from './StreamingMarkdown';
import type { Speaker } from '../../types/chat';

/**
 * Renders the ethereal (streaming) message at the tail of the chat.
 * 
 * Uses ref-based StreamingMarkdown for high-performance DOM updates.
 * Only re-renders when streaming starts/stops - content updates bypass React.
 * Auto-hides when persistent version exists (seamless swap).
 * 
 * Matches MessageItem's layout and styling for visual consistency.
 */
export const EtherealMessage = memo(function EtherealMessage() {
  const meta = useEtherealMeta();
  const { speakers, nodes, tailId } = useServerChat();
  const layout = useLayoutConfig();
  const typography = useTypographyConfig();
  
  // Check if persistent version already exists
  const persistentExists = useMemo(() => {
    if (!meta || !tailId) return false;
    const tailNode = nodes.get(tailId);
    if (!tailNode) return false;
    
    return tailNode.parent_id === meta.parentId && 
           tailNode.speaker_id === meta.speakerId;
  }, [meta, tailId, nodes]);
  
  // Get the actual speaker from the speakers map
  const speaker: Speaker | null = useMemo(() => {
    if (!meta) return null;
    const foundSpeaker = speakers.get(meta.speakerId);
    if (foundSpeaker) return foundSpeaker;
    
    // Fallback if speaker not found (shouldn't happen normally)
    return {
      id: meta.speakerId,
      name: 'Bot',
      is_user: false,
      color: '#9b59b6',
    };
  }, [meta, speakers]);
  
  // Determine alignment based on config (same as MessageItem)
  // Use fallback values when speaker is null to ensure hooks are always called
  const isUser = speaker?.is_user ?? false;
  const alignment = isUser ? layout.userAlignment : layout.botAlignment;
  const alignmentClass = isUser ? 'message-item--user' : 'message-item--bot';

  // Container styles (same as MessageItem)
  // ALL useMemo hooks must be called before any conditional returns
  const containerStyle: CSSProperties = useMemo(() => {
    const base: CSSProperties = {
      display: 'flex',
      position: 'relative',
      marginBottom: gapMap[layout.messageGap],
    };

    switch (layout.metaPosition) {
      case 'left':
        base.flexDirection = 'row';
        base.alignItems = 'flex-start';
        break;
      case 'above':
        base.flexDirection = 'column';
        break;
      case 'inline':
        base.flexDirection = 'column';
        break;
      case 'aside':
        base.flexDirection = 'row';
        base.alignItems = 'flex-start';
        break;
    }

    if (alignment === 'right') {
      base.justifyContent = 'flex-end';
    }

    return base;
  }, [layout.metaPosition, layout.messageGap, alignment]);

  // Body styles (same as MessageItem)
  const bodyStyle: CSSProperties = useMemo(() => {
    const base: CSSProperties = {
      position: 'relative',
      maxWidth: `${layout.bubbleMaxWidth}%`,
    };

    switch (layout.messageStyle) {
      case 'bubble':
        base.backgroundColor = isUser ? '#2d5a7b' : '#3d3d3d';
        base.borderRadius = '12px';
        base.padding = paddingMap[layout.bubblePadding];
        break;
      case 'bordered':
        base.border = '1px solid #444';
        base.borderRadius = '8px';
        base.padding = paddingMap[layout.bubblePadding];
        break;
      case 'flat':
        base.padding = paddingMap[layout.bubblePadding];
        break;
    }

    return base;
  }, [layout.messageStyle, layout.bubbleMaxWidth, layout.bubblePadding, isUser]);

  // Content styles for streaming markdown
  const contentStyle: CSSProperties = useMemo(() => ({
    fontSize: typography.fontSize === 'custom' 
      ? `${typography.customFontSizePx}px` 
      : fontSizeMap[typography.fontSize],
    lineHeight: lineHeightMap[typography.lineHeight],
    fontFamily: fontFamilyMap[typography.fontFamily],
    fontWeight: fontWeightMap[typography.fontWeight],
    color: typography.botTextColor || typography.textColor,
  }), [typography]);
  
  // Early return AFTER all hooks have been called
  if (!meta || !speaker || persistentExists) return null;
  
  return (
    <div 
      className={`message-item ${alignmentClass}`}
      style={containerStyle}
      data-node-id="__ethereal__"
    >
      {/* Meta section - avatar, name, timestamp (same as MessageItem) */}
      {(layout.metaPosition === 'left' || layout.metaPosition === 'above') && (
        <MessageMeta
          speaker={speaker}
          timestamp={meta.startedAt}
          isFirstInGroup={true}
        />
      )}
      
      {/* Aside layout: avatar on left */}
      {layout.metaPosition === 'aside' && (
        <MessageMeta
          speaker={speaker}
          timestamp={meta.startedAt}
          isFirstInGroup={true}
          avatarOnly={true}
        />
      )}
      
      <div className="message-body" style={bodyStyle}>
        {/* Inline meta (name before text) */}
        {layout.metaPosition === 'inline' && (
          <MessageMeta
            speaker={speaker}
            timestamp={meta.startedAt}
            isFirstInGroup={true}
          />
        )}
        
        {/* Aside layout: name/timestamp above text */}
        {layout.metaPosition === 'aside' && (
          <MessageMeta
            speaker={speaker}
            timestamp={meta.startedAt}
            isFirstInGroup={true}
            avatarOnly={false}
          />
        )}
        
        {/* Streaming content - ref-based, no re-renders on chunk updates */}
        <StreamingMarkdown 
          className="message-content streaming"
          style={contentStyle}
        />
      </div>
    </div>
  );
});
