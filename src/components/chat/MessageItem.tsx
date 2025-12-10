import { memo, useState, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { ChatNode, Speaker } from '../../types/chat';
import { MessageContent } from './MessageContent';
import { MessageMeta } from './MessageMeta';
import { MessageBranchIndicator } from './MessageBranchIndicator';
import { MessageActions } from './MessageActions';
import {
  useLayoutConfig,
  useActionsConfig,
  useBranchConfig,
  useEditConfig,
} from '../../store/messageStyleStore';
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
  onCopy?: (nodeId: string) => void;
}

/**
 * Single message container - composes smaller components.
 * Now fully customizable via messageStyleStore.
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
  onCopy,
}: MessageItemProps) {
  const layout = useLayoutConfig();
  const actionsConfig = useActionsConfig();
  const branchConfig = useBranchConfig();
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

  // Compute visibility styles for actions and branch indicators
  const hoverVisibleStyle: CSSProperties = isHovered ? { opacity: 1 } : {};

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
        
        {isEditing ? (
          <div className="message-edit-actions" style={editButtonsStyle}>
            <button onClick={handleSaveEdit}>Save</button>
            <button onClick={handleCancelEdit}>Cancel</button>
          </div>
        ) : (
          <>
            {/* Branch indicator with hover visibility */}
            <div style={branchConfig.visibility === 'hover' ? hoverVisibleStyle : undefined}>
              <MessageBranchIndicator
                nodeId={node.id}
                siblingCount={siblingCount}
                currentIndex={currentSiblingIndex}
                onSwitchBranch={onSwitchBranch}
              />
            </div>
            
            {/* Actions with hover visibility */}
            <div style={actionsConfig.visibility === 'hover' ? hoverVisibleStyle : undefined}>
              <MessageActions
                nodeId={node.id}
                isBot={node.is_bot}
                onEdit={handleStartEdit}
                onDelete={onDelete}
                onRegenerate={node.is_bot ? onRegenerate : undefined}
                onBranch={onBranch}
                onCopy={handleCopy}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
});
