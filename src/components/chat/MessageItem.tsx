import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { ChatNode, Speaker } from '../../types/chat';
import { MessageContent } from './MessageContent';
import { MessageMeta } from './MessageMeta';
import { MessageBranchIndicator } from './MessageBranchIndicator';
import { MessageActions } from './MessageActions';
import { useLayoutConfig, useEditConfig } from '../../hooks/queries/useProfiles';
import { gapMap, paddingMap } from '../../types/messageStyle';
import { useIsStreamingNode } from '../../store/streamingStore';

interface MessageItemProps {
  node: ChatNode;
  speaker: Speaker;
  isFirstInGroup: boolean;
  siblingCount: number;
  currentSiblingIndex: number;
  onEdit: (nodeId: string, content: string) => void;
  onDelete: (nodeId: string) => void;
  onRegenerate?: (nodeId: string) => void;
  onBranch: (nodeId: string) => void;
  onSwitchBranch: (nodeId: string, direction: 'prev' | 'next') => void;
  onCreateBranch: (nodeId: string) => void;
  onCopy?: (nodeId: string) => void;
}

// Custom comparison to prevent re-renders when data hasn't changed
// Compares actual data values, not object references
function arePropsEqual(prev: MessageItemProps, next: MessageItemProps): boolean {
  // Compare node data (not reference)
  if (prev.node.id !== next.node.id) return false;
  if (prev.node.message !== next.node.message) return false;
  if (prev.node.speaker_id !== next.node.speaker_id) return false;
  if (prev.node.is_bot !== next.node.is_bot) return false;
  if (prev.node.created_at !== next.node.created_at) return false;
  if (prev.node.updated_at !== next.node.updated_at) return false;
  if (prev.node.client_id !== next.node.client_id) return false;
  
  // Compare speaker data (not reference)
  if (prev.speaker.id !== next.speaker.id) return false;
  if (prev.speaker.name !== next.speaker.name) return false;
  if (prev.speaker.color !== next.speaker.color) return false;
  if (prev.speaker.avatar_url !== next.speaker.avatar_url) return false;
  if (prev.speaker.is_user !== next.speaker.is_user) return false;
  
  // Compare primitives
  if (prev.isFirstInGroup !== next.isFirstInGroup) return false;
  if (prev.siblingCount !== next.siblingCount) return false;
  if (prev.currentSiblingIndex !== next.currentSiblingIndex) return false;
  
  // Callbacks are compared by reference, but they should be stable via useCallback
  // Skip comparing them - they should be stable from parent
  
  return true;
}

/**
 * Single message container - composes smaller components.
 * Styles from profile config via TanStack Query.
 * 
 * Handles:
 * - Layout orchestration based on style config
 * - Edit state management
 * - Hover state for visibility toggling
 * - Passing correct props to children
 */
export const MessageItem = memo(function MessageItem({
  node,
  speaker,
  isFirstInGroup,
  siblingCount,
  currentSiblingIndex,
  onEdit,
  onDelete,
  onRegenerate,
  onBranch,
  onSwitchBranch,
  onCreateBranch,
  onCopy,
}: MessageItemProps) {
  const layout = useLayoutConfig();
  const editConfig = useEditConfig();
  const isStreamingThis = useIsStreamingNode(node.client_id);
  const isNovel = layout.viewMode === 'novel';

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isEditing) setEditContent(node.message);
  }, [isEditing, node.message]);

  // If grouping is disabled, treat every message as first-in-group for meta rendering.
  // (MessageList computes isFirstInGroup purely from consecutive speakers.)
  const showMetaForThisMessage = !layout.groupConsecutive || isFirstInGroup;

  const handleStartEdit = () => {
    setEditContent(node.message);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEdit(node.id, editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(node.message);
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(node.message);
    onCopy?.(node.id);
  }, [node.id, node.message, onCopy]);

  // Alignment removed: everything is left-aligned.

  // Container styles
  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      position: 'relative',
      // If dividers are enabled, spacing is handled by the divider itself.
      marginBottom: layout.showMessageDividers ? '0px' : gapMap[layout.messageGap],
    };

    if (layout.viewMode === 'novel') {
      // Novel mode: single-column text flow, no avatar/name/timestamp.
      base.flexDirection = 'column';
      base.alignItems = 'stretch';
      base.justifyContent = 'flex-start';
      return base;
    }

    // Bubble style: wrap the whole message item in a rounded container.
    if (layout.messageStyle === 'bubble') {
      base.backgroundColor = layout.bubbleBackgroundColor;
      base.borderColor = layout.bubbleBorderColor;
      base.borderStyle = 'solid';
      base.borderWidth = `${layout.bubbleBorderWidthPx}px`;
      base.borderRadius = `${layout.bubbleRadiusPx}px`;
      base.padding = paddingMap[layout.bubblePadding];
    }

    // Layout direction based on metaPosition
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
        // Avatar gets its own section on the right, text/name on left
        base.flexDirection = 'row';
        base.alignItems = 'flex-start';
        break;
    }

    return base;
  }, [
    layout.metaPosition,
    layout.messageGap,
    layout.showMessageDividers,
    layout.viewMode,
    layout.messageStyle,
    layout.bubblePadding,
    layout.bubbleBackgroundColor,
    layout.bubbleBorderColor,
    layout.bubbleBorderWidthPx,
    layout.bubbleRadiusPx,
  ]);

  // Message body styles
  const bodyStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'relative',
      maxWidth: `${layout.bubbleMaxWidth}%`,
    };

    if (layout.viewMode === 'novel') {
      base.maxWidth = '100%';
      base.padding = '0px';
      base.backgroundColor = 'transparent';
      // Keep it simple: no "bubble" styling in novel mode.
      return base;
    }

    // Message style
    switch (layout.messageStyle) {
      case 'bubble':
        // Bubble now applies to the outer message-item wrapper.
        // Keep body transparent and unpadded.
        base.backgroundColor = 'transparent';
        base.padding = '0px';
        break;
      case 'flat':
        base.padding = paddingMap[layout.bubblePadding];
        break;
    }

    return base;
  }, [layout.viewMode, layout.messageStyle, layout.bubbleMaxWidth, layout.bubblePadding]);

  // Hover handlers for visibility-based elements
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Edit buttons position style
  const editButtonsStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      gap: '8px',
      marginTop: '8px',
    };
    
    if (editConfig.buttonPosition === 'inline') {
      base.marginTop = '4px';
    }
    
    return base;
  }, [editConfig.buttonPosition]);

  return (
    <div 
      className="message-item"
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={isHovered}
      data-node-id={node.id}
    >
      {/* Meta section - avatar, name, timestamp (left/above layouts) */}
      {!isNovel && (layout.metaPosition === 'left' || layout.metaPosition === 'above') && (
        <MessageMeta
          speaker={speaker}
          timestamp={node.created_at}
          isFirstInGroup={isFirstInGroup}
        />
      )}
      
      {/* Aside layout: avatar in its own section on the left */}
      {!isNovel && layout.metaPosition === 'aside' && (
        <MessageMeta
          speaker={speaker}
          timestamp={node.created_at}
          isFirstInGroup={isFirstInGroup}
          avatarOnly={true}
        />
      )}
      
      <div className="message-body" style={bodyStyle}>
        {/* Inline meta (name before text) */}
        {!isNovel && layout.metaPosition === 'inline' && showMetaForThisMessage && (
          <MessageMeta
            speaker={speaker}
            timestamp={node.created_at}
            isFirstInGroup={isFirstInGroup}
          />
        )}
        
        {/* Aside layout: name/timestamp above text, avatar separate */}
        {!isNovel && layout.metaPosition === 'aside' && showMetaForThisMessage && (
          <MessageMeta
            speaker={speaker}
            timestamp={node.created_at}
            isFirstInGroup={isFirstInGroup}
            avatarOnly={false}
          />
        )}
        
        <MessageContent
          nodeId={node.id}
          content={isEditing ? editContent : node.message}
          isBot={node.is_bot}
          isStreaming={isStreamingThis}
          isEditing={isEditing}
          onEditChange={setEditContent}
        />
        
        {isEditing && (
          <div className="message-edit-actions" style={editButtonsStyle}>
            <button onClick={handleSaveEdit}>Save</button>
            <button onClick={handleCancelEdit}>Cancel</button>
          </div>
        )}
      </div>
      
      {/* Actions in top-right corner of message-item */}
      {!isEditing && (
        <MessageActions
          nodeId={node.id}
          isBot={node.is_bot}
          siblingCount={siblingCount}
          currentSiblingIndex={currentSiblingIndex}
          onEdit={handleStartEdit}
          onDelete={onDelete}
          onRegenerate={node.is_bot ? onRegenerate : undefined}
          onBranch={onBranch}
          onCopy={handleCopy}
        />
      )}
      
      {/* Branch chevrons at left/right edges */}
      <MessageBranchIndicator
        nodeId={node.id}
        siblingCount={siblingCount}
        currentIndex={currentSiblingIndex}
        onSwitchBranch={onSwitchBranch}
        onCreateBranch={onCreateBranch}
      />
    </div>
  );
}, arePropsEqual);
