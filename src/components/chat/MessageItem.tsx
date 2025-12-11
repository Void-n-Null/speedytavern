import { memo, useState, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { ChatNode, Speaker } from '../../types/chat';
import { MessageContent } from './MessageContent';
import { MessageMeta } from './MessageMeta';
import { MessageBranchIndicator } from './MessageBranchIndicator';
import { MessageActions } from './MessageActions';
import { useLayoutConfig, useEditConfig } from '../../hooks/queries/useProfiles';
import { gapMap, paddingMap } from '../../types/messageStyle';

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
  if (prev.node.created_at !== next.node.created_at) return false;
  
  // Compare speaker data (not reference)
  if (prev.speaker.id !== next.speaker.id) return false;
  if (prev.speaker.name !== next.speaker.name) return false;
  if (prev.speaker.color !== next.speaker.color) return false;
  
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

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.message);
  const [isHovered, setIsHovered] = useState(false);

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

  // Determine alignment based on config
  const alignment = speaker.is_user ? layout.userAlignment : layout.botAlignment;
  const alignmentClass = speaker.is_user ? 'message-item--user' : 'message-item--bot';

  // Container styles
  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      position: 'relative',
      marginBottom: gapMap[layout.messageGap],
    };

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
    }

    // Alignment (for user vs bot)
    if (alignment === 'right') {
      base.justifyContent = 'flex-end';
    }

    return base;
  }, [layout.metaPosition, layout.messageGap, alignment]);

  // Message body styles
  const bodyStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'relative',
      maxWidth: `${layout.bubbleMaxWidth}%`,
    };

    // Message style (bubble, flat, bordered)
    switch (layout.messageStyle) {
      case 'bubble':
        base.backgroundColor = speaker.is_user ? '#2d5a7b' : '#3d3d3d';
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
  }, [layout.messageStyle, layout.bubbleMaxWidth, layout.bubblePadding, speaker.is_user]);

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
      className={`message-item ${alignmentClass}`}
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-hovered={isHovered}
      data-node-id={node.id}
    >
      {/* Meta section - avatar, name, timestamp */}
      {(layout.metaPosition === 'left' || layout.metaPosition === 'above') && (
        <MessageMeta
          speaker={speaker}
          timestamp={node.created_at}
          isFirstInGroup={isFirstInGroup}
        />
      )}
      
      <div className="message-body" style={bodyStyle}>
        {/* Inline meta (name before text) */}
        {layout.metaPosition === 'inline' && isFirstInGroup && (
          <MessageMeta
            speaker={speaker}
            timestamp={node.created_at}
            isFirstInGroup={isFirstInGroup}
          />
        )}
        
        <MessageContent
          nodeId={node.id}
          content={isEditing ? editContent : node.message}
          isBot={node.is_bot}
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
