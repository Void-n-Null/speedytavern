import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAnimationConfig, useLayoutConfig, useActiveMessageStyle, useMessageListBackgroundConfig } from '../../hooks/queries/useProfiles';
import { gapMap, type GradientDirection } from '../../types/messageStyle';
import { useOptimisticValue } from '../../hooks/useOptimisticValue';
import { useAddMessage, useChatActivePathNodeIds, useChatNode, useChatSpeaker, useDefaultChatId, useDeleteMessage, useEditMessage, useSwitchBranch } from '../../hooks/queries';
import { queryKeys } from '../../lib/queryClient';
import type { ChatFull } from '../../api/client';
import { MessageItem } from './MessageItem';
import { MarkdownStyles } from './MarkdownStyles';
import { pickRandomMessage } from '../../utils/generateDemoData';
import { useMessageListLazyWindowing } from './hooks/useMessageListLazyWindowing';
import { useMessageListScrollFollow } from './hooks/useMessageListScrollFollow';
import { useMessageListBranchSwitching } from './hooks/useMessageListBranchSwitching';

// Lazy rendering config - render last N messages, load more on scroll
const INITIAL_RENDER_LIMIT = 100;
const LOAD_MORE_BATCH = 50;
const LOAD_MORE_AT_TOP_PX = 320;
const TRIM_BACK_AT_BOTTOM_PX = 480;

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
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Flag to prevent auto-scroll from interfering with branch switch scroll restoration
  const skipAutoScrollRef = useRef(false);

  // Shared scroll bookkeeping (used by multiple behaviors)
  const followRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  
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
  const [isDragging, setIsDragging] = useState(false);
  const dragEdgeRef = useRef<'left' | 'right' | null>(null);

  // Optimistic local state for drag - keeps value until server syncs
  const [currentWidth, setLocalWidth] = useOptimisticValue(storedWidth);
  
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
  
  // Handle drag start - capture initial position and width
  const handleMouseDown = useCallback((edge: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      edge,
      startX: e.clientX,
      startWidthPercent: currentWidthRef.current,
    };
    dragEdgeRef.current = edge;
    setIsDragging(true);

    const container = wrapperRef.current;
    if (container) {
      container.style.width = `${currentWidthRef.current}%`;
    }
  }, []); // No deps - uses refs

  // Handle drag move and end - attach once per drag (no React state updates per mousemove)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (!dragRef.current || !wrapper) return;

      const { edge, startX, startWidthPercent } = dragRef.current;
      const parentWidth = wrapper.parentElement?.clientWidth ?? window.innerWidth;

      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX * 2 / parentWidth) * 100;

      let newWidthPercent: number;
      if (edge === 'right') {
        newWidthPercent = startWidthPercent + deltaPercent;
      } else {
        newWidthPercent = startWidthPercent - deltaPercent;
      }

      newWidthPercent = Math.max(20, Math.min(100, newWidthPercent));
      currentWidthRef.current = newWidthPercent;
      wrapper.style.width = `${newWidthPercent}%`;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const finalWidth = currentWidthRef.current;
      dragRef.current = null;
      dragEdgeRef.current = null;

      // Sync local UI state (one render) and persist to store.
      setLocalWidthRef.current(finalWidth);
      setLayoutRef.current({ containerWidth: finalWidth });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Wrapper styles - no transition, instant response
  const wrapperStyle: CSSProperties = {
    width: isMobile ? '100%' : `${(isDragging ? currentWidthRef.current : currentWidth)}%`,
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

  const messageListContentStyle: CSSProperties = useMemo(() => {
    // `.message-list-content` owns the fixed CSS gap; when dividers are enabled, we zero it out
    // so spacing comes from the divider renderer instead.
    return showMessageDividers ? { gap: 0 } : {};
  }, [showMessageDividers]);

  const queryClient = useQueryClient();

  // Chat ID is stable (default chat), fetched once.
  const { data: defaultChatData } = useDefaultChatId();
  const chatId = defaultChatData?.id ?? '';

  // Performance: subscribe only to active path node IDs (not full chat data).
  const activeNodeIds = useChatActivePathNodeIds();

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

  const { visibleNodeIds, tryPrependMore, tryTrimBackDown } = useMessageListLazyWindowing({
    containerRef,
    activeNodeIds,
    skipAutoScrollRef,
    lastScrollTopRef,
    initialRenderLimit: INITIAL_RENDER_LIMIT,
    loadMoreBatch: LOAD_MORE_BATCH,
  });

  useMessageListScrollFollow({
    containerRef,
    contentRef,
    skipAutoScrollRef,
    followRef,
    lastScrollTopRef,
    tryPrependMore,
    tryTrimBackDown,
    loadMoreAtTopPx: LOAD_MORE_AT_TOP_PX,
    trimBackAtBottomPx: TRIM_BACK_AT_BOTTOM_PX,
  });

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

  const handleRegenerate = useCallback((nodeId: string) => {
    // Will trigger AI regeneration
    console.log('Regenerate:', nodeId);
  }, []);

  const { branchAnimation, handleSwitchBranch, handleCreateBranch, getAnimationClass } = useMessageListBranchSwitching({
    containerRef,
    activeNodeIds,
    getChatSnapshot,
    switchBranch: (leafId) => {
      void switchBranchRef.current(leafId);
    },
    addMessage: (params) => addMessageRef.current(params),
    skipAutoScrollRef,
    animationsEnabled,
    branchSwitchAnimation,
    getNewBranchContent: (isUser) => `[Branch] ${pickRandomMessage(isUser)}`,
  });

  return (
    <div 
      className="message-list-wrapper"
      ref={wrapperRef}
      style={wrapperStyle}
      data-dragging={isDragging}
      data-drag-edge={dragEdgeRef.current ?? undefined}
    >
      {/* Left resize handle - hidden on mobile */}
      {!isMobile && (
        <div
          className="message-list-resize-handle"
          style={leftHandleStyle}
          onMouseDown={handleMouseDown('left')}
          data-edge="left"
        />
      )}
      
      {/* Right resize handle - hidden on mobile */}
      {!isMobile && (
        <div
          className="message-list-resize-handle"
          style={rightHandleStyle}
          onMouseDown={handleMouseDown('right')}
          data-edge="right"
        />
      )}
      
      {/* Message container */}
      <div className="message-list" ref={containerRef} style={messageListContainerStyle}>
        <div className="message-list-content" ref={contentRef} style={messageListContentStyle}>
          {/* Dynamic markdown styles based on config */}
          <MarkdownStyles />
          
          {visibleNodeIds.ids.map((nodeId, localIndex) => {
            // Convert local index to global index for animation calculations
            const globalIndex = visibleNodeIds.startIndex + localIndex;
            const animClass = getAnimationClass(globalIndex);
            const prevNodeId = globalIndex > 0 ? activeNodeIds[globalIndex - 1] : null;
            const nextNodeId = localIndex < visibleNodeIds.ids.length - 1 ? visibleNodeIds.ids[localIndex + 1] : null;

            // Divider/spacer between rows (never after the last visible row)
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
            // Use animation ID in key to ensure animation only runs once per switch
            // When animClass is set, key includes animation ID so element is fresh
            // When animClass is cleared, key reverts to just node.id (stable)
            const key = animClass && branchAnimation ? `${nodeId}-anim-${branchAnimation.id}` : nodeId;
            return (
              <div key={key} className={animClass || undefined}>
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
            );
          })}

          {/* Used for bottom detection/observation (no visual) */}
          <div className="message-list-bottom-sentinel" ref={bottomSentinelRef} aria-hidden="true" />
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
