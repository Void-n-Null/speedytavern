import { useCallback, useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import type { CSSProperties } from 'react';
import { useMessageStyleStore } from '../../store/messageStyleStore';
import { useServerChat } from '../../hooks/queries';
import { MessageItem } from './MessageItem';
import { EtherealMessage } from './EtherealMessage';
import { pickRandomMessage } from '../../utils/generateDemoData';

/**
 * Message list container with optimizations.
 * 
 * Optimization strategies:
 * 1. Only subscribes to node_ids array, not full nodes
 * 2. Each MessageItem subscribes to its own node (isolated re-renders)
 * 3. Stable callback references (useCallback)
 * 4. Auto-scroll to bottom on new messages
 * 
 * Features:
 * - Resizable width via drag handles on left/right edges
 * - Full width on mobile
 */
export function MessageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Scroll anchoring state for branch switching
  const pendingScrollAnchor = useRef<{
    parentId: string;          // Parent of the branched node (stable reference)
    offsetFromTop: number;     // Where the branched item was on screen (relative to viewport)
    viewportTop: number;       // Element's top relative to document
    direction: 'prev' | 'next'; // Direction of the switch for animation
  } | null>(null);
  
  // Flag to prevent auto-scroll from interfering with branch switch scroll restoration
  const skipAutoScrollRef = useRef(false);
  
  // Animation state for branch switching
  const [branchAnimation, setBranchAnimation] = useState<{
    active: boolean;
    direction: 'prev' | 'next';
    parentId: string;  // Parent of branch point - messages after this should animate
  } | null>(null);
  
  // Get animation settings
  const branchSwitchAnimation = useMessageStyleStore((s) => s.config.animation.branchSwitchAnimation);
  const animationsEnabled = useMessageStyleStore((s) => s.config.animation.enabled);
  
  // Only subscribe to containerWidth from store (for initial value and settings panel sync)
  const storedWidth = useMessageStyleStore((s) => s.config.layout.containerWidth);
  const setLayout = useMessageStyleStore((s) => s.setLayout);
  
  // Local state for live dragging - doesn't trigger store updates until release
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const dragRef = useRef<{ edge: 'left' | 'right'; startX: number; startWidthPercent: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Sync local width when store changes (e.g., from settings panel)
  useEffect(() => {
    if (liveWidth === null) return; // Don't sync during drag
  }, [storedWidth]);
  
  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // The actual width to render - use liveWidth during drag, store otherwise
  const currentWidth = liveWidth ?? storedWidth;
  
  // Handle drag start - capture initial position and width
  const handleMouseDown = useCallback((edge: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      edge,
      startX: e.clientX,
      startWidthPercent: currentWidth,
    };
    setLiveWidth(currentWidth); // Start tracking locally
  }, [currentWidth]);
  
  // Handle drag move and end
  useEffect(() => {
    if (liveWidth === null || !dragRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !wrapperRef.current) return;
      
      const { edge, startX, startWidthPercent } = dragRef.current;
      const parentWidth = wrapperRef.current.parentElement?.clientWidth ?? window.innerWidth;
      
      // Calculate mouse delta from start position
      const deltaX = e.clientX - startX;
      
      // Convert delta to percentage (multiply by 2 for centered container)
      const deltaPercent = (deltaX * 2 / parentWidth) * 100;
      
      let newWidthPercent: number;
      if (edge === 'right') {
        newWidthPercent = startWidthPercent + deltaPercent;
      } else {
        newWidthPercent = startWidthPercent - deltaPercent;
      }
      
      // Clamp and update LOCAL state only (no store update = no re-renders downstream)
      newWidthPercent = Math.max(20, Math.min(100, newWidthPercent));
      setLiveWidth(newWidthPercent);
    };
    
    const handleMouseUp = () => {
      // Commit to store on release (persists to localStorage)
      if (liveWidth !== null) {
        setLayout({ containerWidth: liveWidth });
      }
      dragRef.current = null;
      setLiveWidth(null); // Stop local tracking
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [liveWidth, setLayout]);
  
  // Wrapper styles - no transition, instant response
  const wrapperStyle: CSSProperties = {
    width: isMobile ? '100%' : `${currentWidth}%`,
    margin: '0 auto',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  };
  
  // Resize handle styles
  const handleStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '8px',
    cursor: 'col-resize',
    zIndex: 10,
  };
  
  const leftHandleStyle: CSSProperties = { ...handleStyle, left: '-4px' };
  const rightHandleStyle: CSSProperties = { ...handleStyle, right: '-4px' };
  
  // All chat data from TanStack Query (single source of truth)
  const { 
    nodes,
    speakers,
    activePath,
    editMessage: serverEditMessage, 
    deleteMessage: serverDeleteMessage, 
    switchBranch: serverSwitchBranch,
    addMessage: serverAddMessage,
  } = useServerChat();
  
  // Refs for stable access in callbacks (prevents re-renders when mutations change)
  const nodesRef = useRef(nodes);
  const speakersRef = useRef(speakers);
  const serverEditMessageRef = useRef(serverEditMessage);
  const serverDeleteMessageRef = useRef(serverDeleteMessage);
  const serverAddMessageRef = useRef(serverAddMessage);
  const serverSwitchBranchRef = useRef(serverSwitchBranch);
  nodesRef.current = nodes;
  speakersRef.current = speakers;
  serverEditMessageRef.current = serverEditMessage;
  serverDeleteMessageRef.current = serverDeleteMessage;
  serverAddMessageRef.current = serverAddMessage;
  serverSwitchBranchRef.current = serverSwitchBranch;

  // Compute sibling info for each node
  // IMPORTANT: Use node_ids from path, but look up FRESH nodes from the Map
  // This ensures we get the latest content after edits/streaming
  const pathInfo = useMemo(() => {
    return activePath.nodeIds.map((nodeId, index) => {
      const node = nodes.get(nodeId);
      if (!node) {
        console.warn('[MessageList] Node not found:', nodeId);
        return null;
      }
      
      const speaker = speakers.get(node.speaker_id);
      if (!speaker) {
        console.warn('[MessageList] Speaker not found:', node.speaker_id, 'for node:', nodeId);
      }
      
      const parent = node.parent_id ? nodes.get(node.parent_id) : null;
      const siblingCount = parent?.child_ids.length ?? 1;
      const currentSiblingIndex = parent?.child_ids.indexOf(node.id) ?? 0;
      const prevNodeId = index > 0 ? activePath.nodeIds[index - 1] : null;
      const prevNode = prevNodeId ? nodes.get(prevNodeId) : null;
      const isFirstInGroup = !prevNode || prevNode.speaker_id !== node.speaker_id;
      
      return {
        node,
        speaker: speaker ?? { id: node.speaker_id, name: 'Unknown', is_user: false, color: '#666' },
        siblingCount,
        currentSiblingIndex,
        isFirstInGroup,
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activePath.nodeIds, nodes, speakers]);

  // Stable callbacks - use refs to avoid re-creating on every render
  const handleEdit = useCallback((nodeId: string, content: string) => {
    serverEditMessageRef.current(nodeId, content);
  }, []); // Empty deps - uses ref

  const handleDelete = useCallback((nodeId: string) => {
    serverDeleteMessageRef.current(nodeId);
  }, []); // Empty deps - uses ref

  const handleBranch = useCallback((nodeId: string) => {
    // For now, just log - will implement branch creation UI
    console.log('Create branch from:', nodeId);
  }, []);

  // Create a new branch with demo content
  const handleCreateBranch = useCallback(async (nodeId: string) => {
    const currentNodes = nodesRef.current;
    const currentSpeakers = speakersRef.current;
    const node = currentNodes.get(nodeId);
    if (!node?.parent_id) return;
    
    const parent = currentNodes.get(node.parent_id);
    if (!parent) return;
    
    // Capture scroll anchor BEFORE creating the new branch (same as handleSwitchBranch)
    const container = containerRef.current;
    const branchedElement = container?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    
    if (branchedElement && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = branchedElement.getBoundingClientRect();
      pendingScrollAnchor.current = {
        parentId: node.parent_id,
        offsetFromTop: elementRect.top - containerRect.top,
        viewportTop: elementRect.top,
        direction: 'next', // Creating new branch is always "next"
      };
      skipAutoScrollRef.current = true;
      
      // Trigger animation if enabled
      if (animationsEnabled && branchSwitchAnimation !== 'none') {
        setBranchAnimation({ active: true, direction: 'next', parentId: node.parent_id });
      }
    }
    
    // Get the original speaker info to determine if user or bot
    const speaker = currentSpeakers.get(node.speaker_id);
    const isUser = speaker?.is_user ?? false;
    
    // Create new sibling message with random demo content (persisted to server)
    const newContent = `[Branch] ${pickRandomMessage(isUser)}`;
    await serverAddMessageRef.current(node.parent_id, newContent, node.speaker_id, node.is_bot);
    
    // Note: The new message becomes the tail automatically via optimistic update
  }, [animationsEnabled, branchSwitchAnimation]);

  const handleRegenerate = useCallback((nodeId: string) => {
    // Will trigger AI regeneration
    console.log('Regenerate:', nodeId);
  }, []);

  // STABLE callback - no dependencies that change on mutations
  // Access nodes via ref to avoid recreating on every mutation
  const handleSwitchBranch = useCallback((nodeId: string, direction: 'prev' | 'next') => {
    const currentNodes = nodesRef.current;
    
    const node = currentNodes.get(nodeId);
    if (!node?.parent_id) return;

    const parent = currentNodes.get(node.parent_id);
    if (!parent) return;

    const currentIndex = parent.child_ids.indexOf(nodeId);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= parent.child_ids.length) return;

    // Capture the BRANCHED element's position BEFORE switching
    // We anchor on the current sibling that's being switched away from
    const container = containerRef.current;
    const branchedElement = container?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    
    if (branchedElement && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = branchedElement.getBoundingClientRect();
      // Store the parent ID (to find the new sibling after switch) and position
      // We capture both the offset within container AND the absolute viewport position
      pendingScrollAnchor.current = {
        parentId: node.parent_id,
        offsetFromTop: elementRect.top - containerRect.top,
        viewportTop: elementRect.top,  // Absolute position on screen
        direction,
      };
      // Prevent auto-scroll from interfering
      skipAutoScrollRef.current = true;
      
      // Trigger animation if enabled
      if (animationsEnabled && branchSwitchAnimation !== 'none') {
        setBranchAnimation({ active: true, direction, parentId: node.parent_id });
      }
    }

    const targetSiblingId = parent.child_ids[newIndex];
    
    // Find the leaf of the target sibling's branch by following active_child_index
    let leafId = targetSiblingId;
    let current = currentNodes.get(leafId);
    
    while (current && current.child_ids.length > 0) {
      const nextIndex = current.active_child_index ?? 0;
      leafId = current.child_ids[nextIndex];
      current = currentNodes.get(leafId);
    }

    // Persist to server - optimistic update handles immediate UI
    serverSwitchBranchRef.current(leafId);
  }, [animationsEnabled, branchSwitchAnimation]); // Stable - uses refs

  // Restore scroll position after branch switch (runs synchronously after DOM update)
  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    const container = containerRef.current;
    
    if (!anchor || !container) return;
    
    // Clear anchor to prevent re-triggering (but leave skipAutoScrollRef for useEffect to handle)
    pendingScrollAnchor.current = null;
    
    // Find the NEW sibling in the path (the child of parentId that's now active)
    // Look through the rendered path to find which node has parentId as its parent
    const parentIndex = activePath.nodeIds.findIndex(id => id === anchor.parentId);
    if (parentIndex === -1 || parentIndex >= activePath.nodeIds.length - 1) return;
    
    // The new sibling is the node right after the parent in the path
    const newSiblingId = activePath.nodeIds[parentIndex + 1];
    const anchorElement = container.querySelector(`[data-node-id="${newSiblingId}"]`) as HTMLElement | null;
    if (!anchorElement) return;
    
    const containerRect = container.getBoundingClientRect();
    const elementRect = anchorElement.getBoundingClientRect();
    const currentOffsetFromTop = elementRect.top - containerRect.top;
    
    // Calculate scroll adjustment to restore original position
    const scrollDelta = currentOffsetFromTop - anchor.offsetFromTop;
    const targetScrollTop = container.scrollTop + scrollDelta;
    
    // Check if we can actually scroll to this position
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const minScrollTop = 0;
    
    if (targetScrollTop >= minScrollTop && targetScrollTop <= maxScrollTop) {
      // We can maintain the position - instant snap (no animation needed)
      // Temporarily disable smooth scroll to ensure instant positioning
      const prevScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = targetScrollTop;
      container.style.scrollBehavior = prevScrollBehavior;
    } else {
      // Not enough content to maintain position
      // Use CSS transform to create the illusion of smooth movement
      
      // First, scroll to the closest valid position (disable smooth scroll for instant positioning)
      const clampedScrollTop = Math.max(minScrollTop, Math.min(maxScrollTop, targetScrollTop));
      const prevScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = clampedScrollTop;
      container.style.scrollBehavior = prevScrollBehavior;
      
      // Calculate how much we're "off" from the desired position
      const overshoot = targetScrollTop - clampedScrollTop;
      
      if (Math.abs(overshoot) > 1) {
        // Apply a transform to offset all messages, making element appear at original position
        // Need to force reflow between setting initial state and starting animation
        container.style.transition = 'none';
        container.style.transform = `translateY(${-overshoot}px)`;
        
        // Force reflow to ensure transform is applied before animation starts
        void container.offsetHeight;
        
        // Now animate back to natural position
        container.style.transition = 'transform 300ms ease-out';
        container.style.transform = 'translateY(0)';
        
        // Clean up after animation
        const cleanup = () => {
          container.style.transition = '';
          container.style.transform = '';
          container.removeEventListener('transitionend', cleanup);
        };
        container.addEventListener('transitionend', cleanup);
        
        // Fallback cleanup in case transitionend doesn't fire
        setTimeout(cleanup, 350);
      }
    }
  }, [activePath.nodeIds]); // Trigger when path changes

  // Auto-scroll to bottom when NEW messages are added (not branch switches)
  const prevPathRef = useRef<string[]>(activePath.nodeIds);
  useEffect(() => {
    const prevIds = prevPathRef.current;
    const currentIds = activePath.nodeIds;
    
    // Skip auto-scroll if this was a branch switch (handled by useLayoutEffect above)
    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      prevPathRef.current = currentIds;
      return;
    }
    
    // Only auto-scroll if:
    // 1. Length increased (new message added), OR
    // 2. Last message changed and new path is longer (appended to different branch)
    const lengthIncreased = currentIds.length > prevIds.length;
    const lastChanged = currentIds.length > 0 && prevIds.length > 0 && 
                        currentIds[currentIds.length - 1] !== prevIds[prevIds.length - 1];
    
    if ((lengthIncreased || (lastChanged && lengthIncreased)) && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevPathRef.current = currentIds;
  }, [activePath.nodeIds]);

  // Clear animation state after animation completes
  useEffect(() => {
    if (branchAnimation?.active) {
      const timer = setTimeout(() => {
        setBranchAnimation(null);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [branchAnimation]);

  // Check if a message should be animated (at or after the branch point)
  const shouldAnimateMessage = useCallback((nodeIndex: number): boolean => {
    if (!branchAnimation?.active) return false;
    if (branchSwitchAnimation === 'none') return false;
    
    // Find the index of the parent in the path
    const parentIndex = activePath.nodeIds.indexOf(branchAnimation.parentId);
    // Animate messages AFTER the parent (the branch point and everything below)
    return parentIndex !== -1 && nodeIndex > parentIndex;
  }, [branchAnimation, branchSwitchAnimation, activePath.nodeIds]);
  
  // Get animation class for a message
  const getAnimationClass = useCallback((nodeIndex: number): string => {
    if (!shouldAnimateMessage(nodeIndex)) return '';
    
    if (branchSwitchAnimation === 'slide') {
      return branchAnimation!.direction === 'next' 
        ? 'branch-animate-slide-from-right'
        : 'branch-animate-slide-from-left';
    }
    if (branchSwitchAnimation === 'fade') {
      return 'branch-animate-fade';
    }
    return '';
  }, [shouldAnimateMessage, branchSwitchAnimation, branchAnimation]);

  return (
    <div 
      className="message-list-wrapper"
      ref={wrapperRef}
      style={wrapperStyle}
    >
      {/* Left resize handle - hidden on mobile */}
      {!isMobile && (
        <div
          style={leftHandleStyle}
          onMouseDown={handleMouseDown('left')}
        />
      )}
      
      {/* Right resize handle - hidden on mobile */}
      {!isMobile && (
        <div
          style={rightHandleStyle}
          onMouseDown={handleMouseDown('right')}
        />
      )}
      
      {/* Message container */}
      <div className="message-list" ref={containerRef}>
        {pathInfo.map(({ node, speaker, siblingCount, currentSiblingIndex, isFirstInGroup }, index) => {
          const animClass = getAnimationClass(index);
          return (
            <div key={node.id} className={animClass || undefined}>
              <MessageItem
                node={node}
                speaker={speaker}
                isFirstInGroup={isFirstInGroup}
                siblingCount={siblingCount}
                currentSiblingIndex={currentSiblingIndex}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRegenerate={handleRegenerate}
                onBranch={handleBranch}
                onSwitchBranch={handleSwitchBranch}
                onCreateBranch={handleCreateBranch}
              />
            </div>
          );
        })}
        
        {/* Ethereal (streaming) message at tail */}
        <EtherealMessage />
      </div>
    </div>
  );
}
