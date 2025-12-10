import { memo, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useBranchConfig, useAnimationConfig } from '../../store/messageStyleStore';

interface MessageBranchIndicatorProps {
  nodeId: string;
  siblingCount: number;      // Total siblings (including this one)
  currentIndex: number;      // Which sibling is active (0-indexed)
  onSwitchBranch: (nodeId: string, direction: 'prev' | 'next') => void;
}

/**
 * Shows branch/swipe navigation ON the message itself.
 * Now fully customizable via messageStyleStore.
 */
export const MessageBranchIndicator = memo(function MessageBranchIndicator({
  nodeId,
  siblingCount,
  currentIndex,
  onSwitchBranch,
}: MessageBranchIndicatorProps) {
  const branchConfig = useBranchConfig();
  const animationConfig = useAnimationConfig();

  // Don't render at all if when-multiple and no siblings
  if (siblingCount <= 1 && branchConfig.visibility === 'when-multiple') {
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

  // Container styles
  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    };

    // Position handling
    switch (branchConfig.position) {
      case 'top-right':
        base.position = 'absolute';
        base.top = '4px';
        base.right = '4px';
        break;
      case 'bottom':
        base.marginTop = '8px';
        base.justifyContent = 'center';
        break;
      case 'inline-after-meta':
        // Default inline flow
        break;
    }

    // Visibility handling
    if (branchConfig.visibility === 'hover') {
      base.opacity = 0;
      if (animationConfig.enabled && animationConfig.hoverTransition !== 'none') {
        base.transition = 'opacity 0.15s ease-in-out';
      }
    }

    return base;
  }, [branchConfig.position, branchConfig.visibility, animationConfig]);

  // Button style
  const buttonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: '16px',
    opacity: 0.7,
  };

  const disabledButtonStyle: CSSProperties = {
    ...buttonStyle,
    opacity: 0.3,
    cursor: 'default',
  };

  // Render content based on style
  const renderContent = () => {
    switch (branchConfig.style) {
      case 'dots':
        return (
          <span className="branch-dots">
            {Array.from({ length: siblingCount }).map((_, i) => (
              <span key={i} style={{ opacity: i === currentIndex ? 1 : 0.4 }}>
                {i === currentIndex ? '●' : '○'}
              </span>
            ))}
          </span>
        );
      
      case 'minimal':
        return (
          <span className="branch-counter" style={{ fontSize: '12px', opacity: 0.7 }}>
            {currentIndex + 1}/{siblingCount}
          </span>
        );
      
      case 'arrows':
      default:
        return (
          <>
            <button
              className="branch-nav-btn"
              style={canGoPrev ? buttonStyle : disabledButtonStyle}
              onClick={handlePrev}
              disabled={!canGoPrev}
              aria-label="Previous branch"
            >
              ‹
            </button>
            <span className="branch-counter" style={{ fontSize: '12px', minWidth: '32px', textAlign: 'center' }}>
              {currentIndex + 1}/{siblingCount}
            </span>
            <button
              className="branch-nav-btn"
              style={canGoNext ? buttonStyle : disabledButtonStyle}
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next branch"
            >
              ›
            </button>
          </>
        );
    }
  };

  const visibilityClass = branchConfig.visibility === 'hover' ? 'message-branch--hover' : '';

  return (
    <div 
      className={`message-branch-indicator ${visibilityClass}`}
      style={containerStyle}
      data-visibility={branchConfig.visibility}
    >
      {renderContent()}
    </div>
  );
});
