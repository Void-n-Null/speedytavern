import { memo, useCallback } from 'react';

interface MessageBranchIndicatorProps {
  nodeId: string;
  siblingCount: number;      // Total siblings (including this one)
  currentIndex: number;      // Which sibling is active (0-indexed)
  onSwitchBranch: (nodeId: string, direction: 'prev' | 'next') => void;
}

/**
 * Shows branch/swipe navigation ON the message itself.
 * 
 * Responsibilities:
 * - Display "2/3" style indicator
 * - Previous/next navigation arrows
 * - Only visible when siblings > 1
 * 
 * Design improvement over SillyTavern:
 * - Colocated with the message it controls
 * - Clear "X of Y" format, not cryptic
 */
export const MessageBranchIndicator = memo(function MessageBranchIndicator({
  nodeId,
  siblingCount,
  currentIndex,
  onSwitchBranch,
}: MessageBranchIndicatorProps) {
  // Don't show if no branches
  if (siblingCount <= 1) {
    return null;
  }

  const handlePrev = useCallback(() => {
    onSwitchBranch(nodeId, 'prev');
  }, [nodeId, onSwitchBranch]);

  const handleNext = useCallback(() => {
    onSwitchBranch(nodeId, 'next');
  }, [nodeId, onSwitchBranch]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < siblingCount - 1;

  return (
    <div className="message-branch-indicator">
      <button
        className="branch-nav-btn"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous branch"
      >
        ‹
      </button>
      <span className="branch-counter">
        {currentIndex + 1}/{siblingCount}
      </span>
      <button
        className="branch-nav-btn"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next branch"
      >
        ›
      </button>
    </div>
  );
});
