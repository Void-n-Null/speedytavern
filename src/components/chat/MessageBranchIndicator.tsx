import { memo, useCallback, useMemo } from 'react';
import { useBranchConfig } from '../../hooks/queries/useProfiles';
import { branchChevronSizeMap } from '../../types/messageStyle';

interface MessageBranchIndicatorProps {
  nodeId: string;
  siblingCount: number;
  currentIndex: number;
  onSwitchBranch: (nodeId: string, direction: 'prev' | 'next') => void;
  onCreateBranch: (nodeId: string) => void;
}

/**
 * Branch navigation with single chevrons on left/right edges.
 * Fixed design - not customizable.
 */
export const MessageBranchIndicator = memo(function MessageBranchIndicator({
  nodeId,
  siblingCount,
  currentIndex,
  onSwitchBranch,
  onCreateBranch,
}: MessageBranchIndicatorProps) {
  const branchConfig = useBranchConfig();
  const chevronSize = branchChevronSizeMap[branchConfig.chevronSize || 'md'];

  const chevronStyle = useMemo(
    () => ({
      width: `${chevronSize.width}px`,
      height: `${chevronSize.height}px`,
      fontSize: `${chevronSize.fontSize}px`,
    }),
    [chevronSize.width, chevronSize.height, chevronSize.fontSize]
  );

  const handlePrev = useCallback(() => {
    onSwitchBranch(nodeId, 'prev');
  }, [nodeId, onSwitchBranch]);

  const handleNext = useCallback(() => {
    // If at last sibling, create new branch instead
    if (currentIndex >= siblingCount - 1) {
      onCreateBranch(nodeId);
    } else {
      onSwitchBranch(nodeId, 'next');
    }
  }, [nodeId, siblingCount, currentIndex, onSwitchBranch, onCreateBranch]);

  const canGoPrev = currentIndex > 0;

  return (
    <>
      <button
        className="branch-chevron branch-chevron--left"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous branch"
        style={chevronStyle}
      >
        ‹
      </button>
      <button
        className="branch-chevron branch-chevron--right"
        onClick={handleNext}
        aria-label="Next branch or create new"
        style={chevronStyle}
      >
        ›
      </button>
    </>
  );
});
