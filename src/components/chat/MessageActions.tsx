import { memo, useState, useCallback } from 'react';

interface MessageActionsProps {
  nodeId: string;
  isBot: boolean;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRegenerate?: (nodeId: string) => void;
  onBranch: (nodeId: string) => void;
}

/**
 * Action buttons for a message.
 * 
 * Responsibilities:
 * - Edit button
 * - Delete button (with confirmation)
 * - Regenerate (bot messages only)
 * - Create branch
 * 
 * Design: Always visible but subtle, not hover-dependent.
 * Accessibility: Touch-friendly, keyboard navigable.
 */
export const MessageActions = memo(function MessageActions({
  nodeId,
  isBot,
  onEdit,
  onDelete,
  onRegenerate,
  onBranch,
}: MessageActionsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(nodeId);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, nodeId, onDelete]);

  const handleEdit = useCallback(() => onEdit(nodeId), [nodeId, onEdit]);
  const handleRegenerate = useCallback(() => onRegenerate?.(nodeId), [nodeId, onRegenerate]);
  const handleBranch = useCallback(() => onBranch(nodeId), [nodeId, onBranch]);

  return (
    <div className="message-actions">
      <button
        className="message-action-btn"
        onClick={handleEdit}
        aria-label="Edit message"
        title="Edit"
      >
        ✎
      </button>
      
      {isBot && onRegenerate && (
        <button
          className="message-action-btn"
          onClick={handleRegenerate}
          aria-label="Regenerate response"
          title="Regenerate"
        >
          ↻
        </button>
      )}
      
      <button
        className="message-action-btn"
        onClick={handleBranch}
        aria-label="Create branch from here"
        title="Branch"
      >
        ⑂
      </button>
      
      <button
        className={`message-action-btn ${confirmDelete ? 'message-action-btn--danger' : ''}`}
        onClick={handleDelete}
        aria-label={confirmDelete ? 'Confirm delete' : 'Delete message'}
        title={confirmDelete ? 'Click again to confirm' : 'Delete'}
      >
        {confirmDelete ? '✓' : '×'}
      </button>
    </div>
  );
});
