import { memo, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useActionsConfig } from '../../hooks/queries/useProfiles';
import { actionsSizeMap } from '../../types/messageStyle';

interface MessageActionsProps {
  nodeId: string;
  isBot: boolean;
  siblingCount: number;
  currentSiblingIndex: number;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRegenerate?: (nodeId: string) => void;
  onBranch: (nodeId: string) => void;
  onCopy?: (nodeId: string) => void;
}

/**
 * Action buttons for a message.
 * Styles from profile config via TanStack Query.
 * 
 * Visibility can be 'always' or 'hover' (CSS handles hover state).
 */
export const MessageActions = memo(function MessageActions({
  nodeId,
  isBot,
  siblingCount,
  currentSiblingIndex,
  onEdit,
  onDelete,
  onRegenerate,
  onBranch,
  onCopy,
}: MessageActionsProps) {
  const actionsConfig = useActionsConfig();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(nodeId);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [confirmDelete, nodeId, onDelete]);

  const handleEdit = useCallback(() => onEdit(nodeId), [nodeId, onEdit]);
  const handleRegenerate = useCallback(() => onRegenerate?.(nodeId), [nodeId, onRegenerate]);
  const handleBranch = useCallback(() => onBranch(nodeId), [nodeId, onBranch]);
  const handleCopy = useCallback(() => onCopy?.(nodeId), [nodeId, onCopy]);

  // Container styles - always positioned in top-right corner
  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      position: 'absolute',
      top: '4px',
      right: '4px',
    };

    return base;
  }, []);

  // Button styles
  const buttonStyle = useMemo((): CSSProperties => {
    const size = actionsSizeMap[actionsConfig.size];
    return {
      width: size,
      height: size,
      minWidth: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: actionsConfig.style === 'text' ? '12px' : `calc(${size} * 0.5)`,
    };
  }, [actionsConfig.size, actionsConfig.style]);

  // Render button content based on style
  const renderButtonContent = (icon: string, text: string) => {
    switch (actionsConfig.style) {
      case 'text':
        return text;
      case 'icon-text':
        return <>{icon} {text}</>;
      case 'icon':
      default:
        return icon;
    }
  };

  // Data attribute for CSS hover targeting
  const visibilityClass = actionsConfig.visibility === 'hover' ? 'message-actions--hover' : '';

  return (
    <div 
      className={`message-actions ${visibilityClass}`}
      style={containerStyle}
      data-visibility={actionsConfig.visibility}
    >
      {/* Branch counter badge - shows when multiple branches exist */}
      {siblingCount > 1 && (
        <span className="branch-counter-badge">
          {currentSiblingIndex + 1}/{siblingCount}
        </span>
      )}
      
      {actionsConfig.showEdit && (
        <button
          className="message-action-btn"
          style={buttonStyle}
          onClick={handleEdit}
          aria-label="Edit message"
          title="Edit"
        >
          {renderButtonContent('✎', 'Edit')}
        </button>
      )}
      
      {actionsConfig.showCopy && onCopy && (
        <button
          className="message-action-btn"
          style={buttonStyle}
          onClick={handleCopy}
          aria-label="Copy message"
          title="Copy"
        >
          {renderButtonContent('📋', 'Copy')}
        </button>
      )}
      
      {actionsConfig.showRegenerate && isBot && onRegenerate && (
        <button
          className="message-action-btn"
          style={buttonStyle}
          onClick={handleRegenerate}
          aria-label="Regenerate response"
          title="Regenerate"
        >
          {renderButtonContent('↻', 'Regen')}
        </button>
      )}
      
      {actionsConfig.showBranch && (
        <button
          className="message-action-btn"
          style={buttonStyle}
          onClick={handleBranch}
          aria-label="Create branch from here"
          title="Branch"
        >
          {renderButtonContent('⑂', 'Branch')}
        </button>
      )}
      
      {actionsConfig.showDelete && (
        <button
          className={`message-action-btn ${confirmDelete ? 'message-action-btn--danger' : ''}`}
          style={{
            ...buttonStyle,
            color: confirmDelete ? '#ff4444' : undefined,
          }}
          onClick={handleDelete}
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete message'}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
        >
          {renderButtonContent(confirmDelete ? '✓' : '×', confirmDelete ? 'Confirm' : 'Delete')}
        </button>
      )}
    </div>
  );
});
