import { memo } from 'react';

interface MessageContentProps {
  content: string;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content.
 * Memoized - only re-renders when content actually changes.
 * 
 * Responsibilities:
 * - Display message text
 * - Handle edit mode textarea
 * - Future: markdown rendering, syntax highlighting
 */
export const MessageContent = memo(function MessageContent({
  content,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  if (isEditing) {
    return (
      <textarea
        className="message-content-edit"
        value={content}
        onChange={(e) => onEditChange?.(e.target.value)}
        autoFocus
      />
    );
  }

  return (
    <div className="message-content">
      {content}
    </div>
  );
});
