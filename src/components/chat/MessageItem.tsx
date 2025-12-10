import { memo, useState, useCallback } from 'react';
import type { ChatNode, Speaker } from '../../types/chat';
import { MessageContent } from './MessageContent';
import { MessageMeta } from './MessageMeta';
import { MessageBranchIndicator } from './MessageBranchIndicator';
import { MessageActions } from './MessageActions';

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
}

/**
 * Single message container - composes smaller components.
 * 
 * NOT a god component because:
 * - Delegates content rendering to MessageContent
 * - Delegates metadata to MessageMeta  
 * - Delegates actions to MessageActions
 * - Delegates branch UI to MessageBranchIndicator
 * 
 * This component only handles:
 * - Layout orchestration
 * - Edit state management
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
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.message);

  const handleStartEdit = useCallback(() => {
    setEditContent(node.message);
    setIsEditing(true);
  }, [node.message]);

  const handleSaveEdit = useCallback(() => {
    onEdit(node.id, editContent);
    setIsEditing(false);
  }, [node.id, editContent, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(node.message);
  }, [node.message]);

  const alignmentClass = speaker.is_user ? 'message-item--user' : 'message-item--bot';

  return (
    <div className={`message-item ${alignmentClass}`}>
      <MessageMeta
        speaker={speaker}
        timestamp={node.created_at}
        isFirstInGroup={isFirstInGroup}
      />
      
      <div className="message-body">
        <MessageContent
          content={isEditing ? editContent : node.message}
          isEditing={isEditing}
          onEditChange={setEditContent}
        />
        
        {isEditing ? (
          <div className="message-edit-actions">
            <button onClick={handleSaveEdit}>Save</button>
            <button onClick={handleCancelEdit}>Cancel</button>
          </div>
        ) : (
          <>
            <MessageBranchIndicator
              nodeId={node.id}
              siblingCount={siblingCount}
              currentIndex={currentSiblingIndex}
              onSwitchBranch={onSwitchBranch}
            />
            
            <MessageActions
              nodeId={node.id}
              isBot={node.is_bot}
              onEdit={handleStartEdit}
              onDelete={onDelete}
              onRegenerate={node.is_bot ? onRegenerate : undefined}
              onBranch={onBranch}
            />
          </>
        )}
      </div>
    </div>
  );
});
