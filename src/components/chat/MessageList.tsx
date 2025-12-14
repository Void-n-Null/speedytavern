import { memo, useCallback, useMemo, useRef, useEffect, useState, useLayoutEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAnimationConfig, useLayoutConfig, useActiveMessageStyle, useMessageListBackgroundConfig } from '../../hooks/queries/useProfiles';
import { gapMap, type GradientDirection } from '../../types/messageStyle';
import { useOptimisticValue } from '../../hooks/useOptimisticValue';
import { useAddMessage, useChatActivePathNodeIds, useChatNode, useChatSpeaker, useDefaultChatId, useDeleteMessage, useEditMessage, useSwitchBranch } from '../../hooks/queries';
import { queryKeys } from '../../lib/queryClient';
import type { ChatFull } from '../../api/client';
import { MessageItem } from './MessageItem';
import { MarkdownStyles } from './MarkdownStyles';
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
  const contentRef = useRef<HTMLDivElement>(null);
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

  // ============ Pinned-to-bottom scroll follow ============
  // If true, keep the scroll pinned to the bottom as content grows (e.g. streaming).
  // The moment the user scrolls up, disable follow until they return to bottom.
  const followRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const userScrollIntentRef = useRef(false);
  const userScrollIntentTimeoutRef = useRef<number | null>(null);
  const followScrollRafRef = useRef<number | null>(null);

  const scheduleScrollToBottom = useCallback(() => {
    if (followScrollRafRef.current != null) return;
    if (typeof requestAnimationFrame !== 'function') return;
    followScrollRafRef.current = requestAnimationFrame(() => {
      followScrollRafRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      if (!followRef.current) return;
      if (skipAutoScrollRef.current) return;

      // Clamp to bottom.
      container.scrollTop = container.scrollHeight;
      lastScrollTopRef.current = container.scrollTop;
    });
  }, []);
  
  // Animation state for branch switching
  const [branchAnimation, setBranchAnimation] = useState<{
    active: boolean;
    direction: 'prev' | 'next';
    parentId: string;  // Parent of branch point - messages after this should animate
    oldSiblingId: string;  // The sibling we're switching AWAY from - only animate when NOT in path
    id: number;  // Unique ID to prevent animation restart on re-renders
  } | null>(null);
  const animationIdCounter = useRef(0);
  
  // Get animation settings
  const animationConfig = useAnimationConfig();
  const branchSwitchAnimation = animationConfig.branchSwitchAnimation;
  const animationsEnabled = animationConfig.enabled;
  
  // Only subscribe to containerWidth from store (for initial value and settings panel sync)
  const layoutConfig = useLayoutConfig();
  const storedWidth = layoutConfig.containerWidth;
  const { setLayout } = useActiveMessageStyle();
  const showMessageDividers = layoutConfig.showMessageDividers;
  
  // Message list background config
  const messageListBg = useMessageListBackgroundConfig();
  
  // Drag state
  const dragRef = useRef<{ edge: 'left' | 'right'; startX: number; startWidthPercent: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Optimistic local state for drag - keeps value until server syncs
  const [currentWidth, setLocalWidth, isLocalActive] = useOptimisticValue(storedWidth);
  
  // Refs for values accessed in event handlers (prevents effect re-running during drag)
  const currentWidthRef = useRef(currentWidth);
  const setLocalWidthRef = useRef(setLocalWidth);
  const setLayoutRef = useRef(setLayout);
  currentWidthRef.current = currentWidth;
  setLocalWidthRef.current = setLocalWidth;
  setLayoutRef.current = setLayout;
  
  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keep the viewport pinned to the bottom while following, even when content height changes
  // without React re-rendering (streaming markdown, image loads, etc).
  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    if (typeof ResizeObserver !== 'function') {
      // No ResizeObserver: we still have the "new message" auto-scroll below, but streaming
      // height changes won't be perfectly pinned on ancient browsers.
      return;
    }

    const ro = new ResizeObserver(() => {
      // Avoid yanking during branch-switch scroll restoration.
      if (skipAutoScrollRef.current) return;
      if (!followRef.current) return;
      scheduleScrollToBottom();
    });

    ro.observe(contentEl);

    // Initial pin (e.g., first load of a long chat).
    scheduleScrollToBottom();

    return () => {
      ro.disconnect();
      if (followScrollRafRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(followScrollRafRef.current);
        followScrollRafRef.current = null;
      }
    };
  }, [scheduleScrollToBottom]);

  // Track whether user is "following" the bottom based on scroll behavior.
  // This is input-agnostic: wheel, touch, scrollbar drag will all count as "user intent".
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const REENABLE_AT_BOTTOM_PX = 8;
    const INTENT_TTL_MS = 160;

    const distanceToBottom = () => container.scrollHeight - container.clientHeight - container.scrollTop;
    const isAtBottom = () => distanceToBottom() <= REENABLE_AT_BOTTOM_PX;

    const markUserIntent = () => {
      userScrollIntentRef.current = true;
      if (userScrollIntentTimeoutRef.current != null) {
        window.clearTimeout(userScrollIntentTimeoutRef.current);
      }
      userScrollIntentTimeoutRef.current = window.setTimeout(() => {
        userScrollIntentRef.current = false;
        userScrollIntentTimeoutRef.current = null;
      }, INTENT_TTL_MS);
    };

    const handleScroll = () => {
      const current = container.scrollTop;
      const prev = lastScrollTopRef.current;
      const delta = current - prev;

      if (followRef.current) {
        // Disengage the instant the user scrolls up.
        if (userScrollIntentRef.current && delta < 0) {
          followRef.current = false;
        }
      } else {
        // Re-engage only when the user returns to (basically) the bottom.
        if (isAtBottom()) {
          followRef.current = true;
        }
      }

      lastScrollTopRef.current = current;
    };

    // Initialize refs from current scroll position.
    lastScrollTopRef.current = container.scrollTop;

    // Scroll events on the container.
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Mark intent for the common input modalities.
    container.addEventListener('wheel', markUserIntent, { passive: true });
    container.addEventListener('touchstart', markUserIntent, { passive: true });
    container.addEventListener('touchmove', markUserIntent, { passive: true });
    container.addEventListener('pointerdown', markUserIntent, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', markUserIntent);
      container.removeEventListener('touchstart', markUserIntent);
      container.removeEventListener('touchmove', markUserIntent);
      container.removeEventListener('pointerdown', markUserIntent);
      if (userScrollIntentTimeoutRef.current != null) {
        window.clearTimeout(userScrollIntentTimeoutRef.current);
        userScrollIntentTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Handle drag start - capture initial position and width
  const handleMouseDown = useCallback((edge: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      edge,
      startX: e.clientX,
      startWidthPercent: currentWidthRef.current,
    };
    setLocalWidthRef.current(currentWidthRef.current); // Start tracking locally
  }, []); // No deps - uses refs
  
  // Handle drag move and end - only attach when actively dragging
  useEffect(() => {
    if (!isLocalActive) return;
    
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
      setLocalWidthRef.current(newWidthPercent);
    };
    
    const handleMouseUp = () => {
      // Commit to store on release (persists to server)
      setLayoutRef.current({ containerWidth: currentWidthRef.current });
      dragRef.current = null;
      // Don't clear local state here! Hook clears it when server syncs
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLocalActive]); // Only re-run when drag starts/stops, not during
  
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
  
  // Compute message list background style
  const gradientDirectionMap: Record<GradientDirection, string> = {
    'to-bottom': 'to bottom',
    'to-top': 'to top',
    'to-right': 'to right',
    'to-left': 'to left',
    'to-bottom-right': 'to bottom right',
    'to-bottom-left': 'to bottom left',
  };
  
  // Helper to apply opacity to a color (supports hex, rgb, rgba)
  const applyOpacityToColor = (color: string | undefined, opacity: number): string => {
    if (!color) return `rgba(0, 0, 0, ${opacity})`;
    // If already rgba, adjust the alpha
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    // If rgb, convert to rgba
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    // If hex, convert to rgba
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };
  
  const messageListBackgroundStyle: CSSProperties = useMemo(() => {
    if (!messageListBg.enabled) return {};
    
    const opacity = messageListBg.opacity / 100;
    const baseStyle: CSSProperties = {
      borderRadius: '0px',
    };
    
    // Add backdrop blur if set
    if (messageListBg.blur > 0) {
      baseStyle.backdropFilter = `blur(${messageListBg.blur}px)`;
      baseStyle.WebkitBackdropFilter = `blur(${messageListBg.blur}px)`;
    }
    
    if (messageListBg.type === 'none') {
      return baseStyle;
    }
    
    if (messageListBg.type === 'color') {
      // Apply opacity directly to the color, not the container
      return {
        ...baseStyle,
        backgroundColor: applyOpacityToColor(messageListBg.color, opacity),
      };
    }
    
    if (messageListBg.type === 'gradient') {
      const direction = gradientDirectionMap[messageListBg.gradientDirection];
      // Apply opacity to gradient colors
      const fromColor = applyOpacityToColor(messageListBg.gradientFrom, opacity);
      const toColor = applyOpacityToColor(messageListBg.gradientTo, opacity);
      return {
        ...baseStyle,
        background: `linear-gradient(${direction}, ${fromColor}, ${toColor})`,
      };
    }
    
    return baseStyle;
  }, [messageListBg]);

  // Divider + spacer styles (used when dividers are enabled)
  const separatorStyles = useMemo(() => {
    const messageGapPx = gapMap[layoutConfig.messageGap] ?? '0px';
    const groupGapPx = gapMap[layoutConfig.groupGap] ?? messageGapPx;

    const opacity = (layoutConfig.dividerOpacity ?? 0) / 100;
    const bg = applyOpacityToColor(layoutConfig.dividerColor, opacity);
    const width = `${Math.max(0, Math.min(100, layoutConfig.dividerWidth ?? 100))}%`;

    const baseDivider: CSSProperties = {
      background: bg,
      width,
      marginLeft: 'auto',
      marginRight: 'auto',
    };

    // NOTE: `.message-divider` is 1px tall (see `src/components/chat/chat.css`).
    // We want: marginTop + dividerHeight + marginBottom === configured gap.
    const dividerForGap = (gapPx: string): CSSProperties => {
      const dividerHeightPx = '1px';
      // Clamp at 0 to avoid negative margins when gap < divider height.
      const margin = `max(0px, calc((${gapPx} - ${dividerHeightPx}) / 2))`;
      return {
        ...baseDivider,
        marginTop: margin,
        marginBottom: margin,
      };
    };

    const spacer: CSSProperties = {
      height: messageGapPx,
    };

    return {
      messageGapPx,
      groupGapPx,
      dividerMessage: dividerForGap(messageGapPx),
      dividerGroup: dividerForGap(groupGapPx),
      spacer,
    };
  }, [
    layoutConfig.messageGap,
    layoutConfig.groupGap,
    layoutConfig.dividerColor,
    layoutConfig.dividerOpacity,
    layoutConfig.dividerWidth,
  ]);

  // When dividers are enabled, we want *divider-controlled* spacing (not the fixed CSS gap).
  const messageListContainerStyle: CSSProperties = useMemo(() => {
    return {
      ...messageListBackgroundStyle,
    };
  }, [messageListBackgroundStyle]);

  const queryClient = useQueryClient();

  // Chat ID is stable (default chat), fetched once.
  const { data: defaultChatData } = useDefaultChatId();
  const chatId = defaultChatData?.id ?? '';

  // Performance: subscribe only to active path node IDs (not full chat data).
  const activeNodeIds = useChatActivePathNodeIds();

  // Virtualize the message list to avoid rendering thousands of DOM nodes.
  // We keep the UX semantics (follow/disengage, branch anchoring) identical by
  // continuing to treat `containerRef` as the single scroll source of truth.
  const rowVirtualizer = useVirtualizer({
    count: activeNodeIds.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 140,
    overscan: 12,
    // Preserve stable keys across inserts/branch switches.
    getItemKey: (index) => activeNodeIds[index] ?? index,
    // Match `.message-list-content` vertical padding from CSS (16px top + bottom).
    paddingStart: 16,
    paddingEnd: 16,
    // Match the old flex `gap: 4px` when dividers aren't controlling spacing.
    gap: showMessageDividers ? 0 : 4,
  });
  const virtualTotalSize = rowVirtualizer.getTotalSize();

  // Speaker lookup for divider grouping logic (read from cache; no subscription).
  const speakerIdByNodeId = useMemo(() => {
    if (!chatId) return new Map<string, string>();
    const chat = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
    if (!chat) return new Map<string, string>();
    return new Map<string, string>(chat.nodes.map((n) => [n.id, n.speaker_id]));
  }, [chatId, queryClient, activeNodeIds]);

  // Mutations (actions). We only use mutateAsync, so this should not force list re-renders.
  const addMessageMutation = useAddMessage(chatId);
  const editMessageMutation = useEditMessage(chatId);
  const deleteMessageMutation = useDeleteMessage(chatId);
  const switchBranchMutation = useSwitchBranch(chatId);

  // Refs for stable access in callbacks (prevents effect re-runs).
  const addMessageRef = useRef(addMessageMutation.mutateAsync);
  const editMessageRef = useRef(editMessageMutation.mutateAsync);
  const deleteMessageRef = useRef(deleteMessageMutation.mutateAsync);
  const switchBranchRef = useRef(switchBranchMutation.mutateAsync);
  addMessageRef.current = addMessageMutation.mutateAsync;
  editMessageRef.current = editMessageMutation.mutateAsync;
  deleteMessageRef.current = deleteMessageMutation.mutateAsync;
  switchBranchRef.current = switchBranchMutation.mutateAsync;

  const getChatSnapshot = useCallback((): ChatFull | undefined => {
    if (!chatId) return undefined;
    return queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));
  }, [chatId, queryClient]);

  // Stable callbacks - use refs to avoid re-creating on every render
  const handleEdit = useCallback((nodeId: string, content: string) => {
    void editMessageRef.current({ nodeId, content });
  }, []); // Empty deps - uses ref

  const handleDelete = useCallback((nodeId: string) => {
    void deleteMessageRef.current(nodeId);
  }, []); // Empty deps - uses ref

  const handleBranch = useCallback((nodeId: string) => {
    // For now, just log - will implement branch creation UI
    console.log('Create branch from:', nodeId);
  }, []);

  // Create a new branch with demo content
  const handleCreateBranch = useCallback(async (nodeId: string) => {
    const chat = getChatSnapshot();
    if (!chat) return;

    const currentNodes = new Map(chat.nodes.map(n => [n.id, n]));
    const currentSpeakers = new Map(chat.speakers.map(s => [s.id, s]));

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
      
      // Trigger animation if enabled - nodeId is the sibling we're switching away from
      if (animationsEnabled && branchSwitchAnimation !== 'none') {
        animationIdCounter.current += 1;
        setBranchAnimation({ active: true, direction: 'next', parentId: node.parent_id, oldSiblingId: nodeId, id: animationIdCounter.current });
      }
    }
    
    // Get the original speaker info to determine if user or bot
    const speaker = currentSpeakers.get(node.speaker_id);
    const isUser = speaker?.is_user ?? false;
    
    // Create new sibling message with random demo content (persisted to server)
    const newContent = `[Branch] ${pickRandomMessage(isUser)}`;
    await addMessageRef.current({
      parentId: node.parent_id,
      content: newContent,
      speakerId: node.speaker_id,
      isBot: node.is_bot,
      createdAt: Date.now(),
      // Let server (or our wrapper) choose id
    });
    
    // Note: The new message becomes the tail automatically via optimistic update
  }, [animationsEnabled, branchSwitchAnimation, getChatSnapshot]);

  const handleRegenerate = useCallback((nodeId: string) => {
    // Will trigger AI regeneration
    console.log('Regenerate:', nodeId);
  }, []);

  // STABLE callback - no dependencies that change on mutations
  // Access nodes via ref to avoid recreating on every mutation
  const handleSwitchBranch = useCallback((nodeId: string, direction: 'prev' | 'next') => {
    const chat = getChatSnapshot();
    if (!chat) return;
    const currentNodes = new Map(chat.nodes.map(n => [n.id, n]));
    
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
      
      // Trigger animation if enabled - nodeId is the sibling we're switching away from
      if (animationsEnabled && branchSwitchAnimation !== 'none') {
        animationIdCounter.current += 1;
        setBranchAnimation({ active: true, direction, parentId: node.parent_id, oldSiblingId: nodeId, id: animationIdCounter.current });
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
    void switchBranchRef.current(leafId);
  }, [animationsEnabled, branchSwitchAnimation, getChatSnapshot]); // Stable - uses refs

  // Restore scroll position after branch switch (runs synchronously after DOM update)
  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    const container = containerRef.current;
    
    if (!anchor || !container) return;

    // Find the NEW sibling in the path (the child of parentId that's now active).
    const parentIndex = activeNodeIds.findIndex(id => id === anchor.parentId);
    if (parentIndex === -1 || parentIndex >= activeNodeIds.length - 1) {
      pendingScrollAnchor.current = null;
      return;
    }

    const newSiblingIndex = parentIndex + 1;

    // In virtual mode, avoid DOM querying. Use the virtualizer's measurement cache
    // to compute the scrollTop that places the new sibling at the prior offset.
    const measurement = rowVirtualizer.measurementsCache[newSiblingIndex];
    if (!measurement) {
      // Measurements may not be ready on the first layout pass (esp. during rapid switches).
      // Keep the anchor and retry on the next layout pass when total size/measurements settle.
      return;
    }

    // Clear anchor to prevent re-triggering (but leave skipAutoScrollRef for useEffect to handle).
    pendingScrollAnchor.current = null;

    const targetScrollTop = measurement.start - anchor.offsetFromTop;
    
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
  }, [activeNodeIds, rowVirtualizer, virtualTotalSize]); // Trigger when path changes or measurements settle

  // Clear the "skip" flag after branch-switch scroll restoration has run.
  // We keep it alive through the paint so ResizeObserver-based follow won't fight it.
  useEffect(() => {
    if (!skipAutoScrollRef.current) return;
    if (typeof requestAnimationFrame !== 'function') {
      skipAutoScrollRef.current = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      skipAutoScrollRef.current = false;
    });
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
    };
  }, [activeNodeIds]);

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
    
    // Only animate if we've actually switched (old sibling is NOT in path anymore)
    // This prevents animating the old branch before the optimistic update
    if (activeNodeIds.includes(branchAnimation.oldSiblingId)) return false;
    
    // Find the index of the parent in the path
    const parentIndex = activeNodeIds.indexOf(branchAnimation.parentId);
    // Animate messages AFTER the parent (the branch point and everything below)
    return parentIndex !== -1 && nodeIndex > parentIndex;
  }, [branchAnimation, branchSwitchAnimation, activeNodeIds]);
  
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
      <div className="message-list" ref={containerRef} style={messageListContainerStyle}>
        <div
          className="message-list-content"
          ref={contentRef}
          style={{
            // Override the flex-column CSS for virtual positioning.
            display: 'block',
            position: 'relative',
            height: virtualTotalSize,
            minHeight: '100%',
            // Keep horizontal padding from CSS; vertical padding is handled via virtualizer paddingStart/End.
            padding: '0 6px',
          }}
        >
          {/* Dynamic markdown styles based on config */}
          <MarkdownStyles />

          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const nodeIndex = virtualRow.index;
            const nodeId = activeNodeIds[nodeIndex];
            if (!nodeId) return null;

            const animClass = getAnimationClass(nodeIndex);
            const prevNodeId = nodeIndex > 0 ? activeNodeIds[nodeIndex - 1] : null;
            const nextNodeId = nodeIndex < activeNodeIds.length - 1 ? activeNodeIds[nodeIndex + 1] : null;

            // Divider/spacer between rows (never after the last row)
            let separator: ReactNode = null;
            if (showMessageDividers && nextNodeId) {
              if (layoutConfig.dividerMode === 'messages') {
                separator = (
                  <div className="message-divider" style={separatorStyles.dividerMessage} aria-hidden="true" />
                );
              } else {
                const isBoundary = !layoutConfig.groupConsecutive
                  ? true
                  : speakerIdByNodeId.get(nodeId) !== speakerIdByNodeId.get(nextNodeId);

                if (isBoundary) {
                  separator = (
                    <div className="message-divider" style={separatorStyles.dividerGroup} aria-hidden="true" />
                  );
                } else if (separatorStyles.messageGapPx !== '0px') {
                  separator = <div style={separatorStyles.spacer} aria-hidden="true" />;
                }
              }
            }

            return (
              <div
                key={virtualRow.key}
                ref={rowVirtualizer.measureElement}
                data-index={nodeIndex}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* Nested wrapper so branch animation transforms don't clobber the Y-translate used for virtualization. */}
                <div className={animClass || undefined}>
                  <MessageItemRow
                    nodeId={nodeId}
                    prevNodeId={prevNodeId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRegenerate={handleRegenerate}
                    onBranch={handleBranch}
                    onSwitchBranch={handleSwitchBranch}
                    onCreateBranch={handleCreateBranch}
                  />
                  {separator}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MessageItemRowProps {
  nodeId: string;
  prevNodeId: string | null;
  onEdit: (nodeId: string, content: string) => void;
  onDelete: (nodeId: string) => void;
  onRegenerate?: (nodeId: string) => void;
  onBranch: (nodeId: string) => void;
  onSwitchBranch: (nodeId: string, direction: 'prev' | 'next') => void;
  onCreateBranch: (nodeId: string) => void;
}

function MessageItemRowImpl({
  nodeId,
  prevNodeId,
  onEdit,
  onDelete,
  onRegenerate,
  onBranch,
  onSwitchBranch,
  onCreateBranch,
}: MessageItemRowProps) {
  const node = useChatNode(nodeId);
  const prevNode = useChatNode(prevNodeId);
  const parentNode = useChatNode(node?.parent_id ?? null);
  const speaker = useChatSpeaker(node?.speaker_id ?? null);

  if (!node) return null;
  if (!speaker) {
    // Fallback if speaker missing (should be rare).
    return (
      <MessageItem
        node={node}
        speaker={{ id: node.speaker_id, name: 'Unknown', is_user: false, color: '#666' }}
        isFirstInGroup={!prevNode || prevNode.speaker_id !== node.speaker_id}
        siblingCount={parentNode?.child_ids.length ?? 1}
        currentSiblingIndex={parentNode?.child_ids.indexOf(node.id) ?? 0}
        onEdit={onEdit}
        onDelete={onDelete}
        onRegenerate={onRegenerate}
        onBranch={onBranch}
        onSwitchBranch={onSwitchBranch}
        onCreateBranch={onCreateBranch}
      />
    );
  }

  const siblingCount = parentNode?.child_ids.length ?? 1;
  const currentSiblingIndex = parentNode?.child_ids.indexOf(node.id) ?? 0;
  const isFirstInGroup = !prevNode || prevNode.speaker_id !== node.speaker_id;

  return (
    <MessageItem
      node={node}
      speaker={speaker}
      isFirstInGroup={isFirstInGroup}
      siblingCount={siblingCount}
      currentSiblingIndex={currentSiblingIndex}
      onEdit={onEdit}
      onDelete={onDelete}
      onRegenerate={onRegenerate}
      onBranch={onBranch}
      onSwitchBranch={onSwitchBranch}
      onCreateBranch={onCreateBranch}
    />
  );
}

// Memoize row so a single MessageList render (e.g. append) doesn't re-render every row.
const MessageItemRow = memo(MessageItemRowImpl);
