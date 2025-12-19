import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatFull } from '../../../api/chats';

type BranchSwitchDirection = 'prev' | 'next';

type BranchAnimation = {
  active: boolean;
  direction: BranchSwitchDirection;
  parentId: string;
  oldSiblingId: string;
  id: number;
};

type PendingScrollAnchor = {
  parentId: string;
  offsetFromTop: number;
  viewportTop: number;
  direction: BranchSwitchDirection;
};

export interface UseMessageListBranchSwitchingParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeNodeIds: string[];
  getChatSnapshot: () => ChatFull | undefined;
  switchBranch: (leafId: string) => void;
  addMessage: (params: {
    parentId: string;
    content: string;
    speakerId: string;
    isBot: boolean;
    createdAt: number;
    id?: string;
  }) => Promise<unknown>;
  skipAutoScrollRef: React.MutableRefObject<boolean>;
  animationsEnabled: boolean;
  branchSwitchAnimation: 'none' | 'fade' | 'slide';
  getNewBranchContent: (isUser: boolean) => string;
}

export interface UseMessageListBranchSwitchingResult {
  branchAnimation: BranchAnimation | null;
  handleSwitchBranch: (nodeId: string, direction: BranchSwitchDirection) => void;
  handleCreateBranch: (nodeId: string) => Promise<void>;
  getAnimationClass: (nodeIndex: number) => string;
}

export function useMessageListBranchSwitching({
  containerRef,
  activeNodeIds,
  getChatSnapshot,
  switchBranch,
  addMessage,
  skipAutoScrollRef,
  animationsEnabled,
  branchSwitchAnimation,
  getNewBranchContent,
}: UseMessageListBranchSwitchingParams): UseMessageListBranchSwitchingResult {
  const pendingScrollAnchor = useRef<PendingScrollAnchor | null>(null);

  const [branchAnimation, setBranchAnimation] = useState<BranchAnimation | null>(null);
  const animationIdCounter = useRef(0);

  const handleCreateBranch = useCallback(
    async (nodeId: string) => {
      const chat = getChatSnapshot();
      if (!chat) return;

      const currentNodes = new Map(chat.nodes.map((n) => [n.id, n]));
      const currentSpeakers = new Map(chat.speakers.map((s) => [s.id, s]));

      const node = currentNodes.get(nodeId);
      if (!node?.parent_id) return;

      const parent = currentNodes.get(node.parent_id);
      if (!parent) return;

      const container = containerRef.current;
      const branchedElement = container?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;

      if (branchedElement && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = branchedElement.getBoundingClientRect();
        pendingScrollAnchor.current = {
          parentId: node.parent_id,
          offsetFromTop: elementRect.top - containerRect.top,
          viewportTop: elementRect.top,
          direction: 'next',
        };
        skipAutoScrollRef.current = true;

        if (animationsEnabled && branchSwitchAnimation !== 'none') {
          animationIdCounter.current += 1;
          setBranchAnimation({
            active: true,
            direction: 'next',
            parentId: node.parent_id,
            oldSiblingId: nodeId,
            id: animationIdCounter.current,
          });
        }
      }

      const speaker = currentSpeakers.get(node.speaker_id);
      const isUser = speaker?.is_user ?? false;

      const newContent = getNewBranchContent(isUser);
      await addMessage({
        parentId: node.parent_id,
        content: newContent,
        speakerId: node.speaker_id,
        isBot: node.is_bot,
        createdAt: Date.now(),
      });
    },
    [
      addMessage,
      animationsEnabled,
      branchSwitchAnimation,
      containerRef,
      getChatSnapshot,
      getNewBranchContent,
      skipAutoScrollRef,
    ]
  );

  const handleSwitchBranch = useCallback(
    (nodeId: string, direction: BranchSwitchDirection) => {
      const chat = getChatSnapshot();
      if (!chat) return;
      const currentNodes = new Map(chat.nodes.map((n) => [n.id, n]));

      const node = currentNodes.get(nodeId);
      if (!node?.parent_id) return;

      const parent = currentNodes.get(node.parent_id);
      if (!parent) return;

      const currentIndex = parent.child_ids.indexOf(nodeId);
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= parent.child_ids.length) return;

      const container = containerRef.current;
      const branchedElement = container?.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;

      if (branchedElement && container) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = branchedElement.getBoundingClientRect();
        pendingScrollAnchor.current = {
          parentId: node.parent_id,
          offsetFromTop: elementRect.top - containerRect.top,
          viewportTop: elementRect.top,
          direction,
        };
        skipAutoScrollRef.current = true;

        if (animationsEnabled && branchSwitchAnimation !== 'none') {
          animationIdCounter.current += 1;
          setBranchAnimation({
            active: true,
            direction,
            parentId: node.parent_id,
            oldSiblingId: nodeId,
            id: animationIdCounter.current,
          });
        }
      }

      const targetSiblingId = parent.child_ids[newIndex];

      let leafId = targetSiblingId;
      let current = currentNodes.get(leafId);

      while (current && current.child_ids.length > 0) {
        const nextIndex = current.active_child_index ?? 0;
        leafId = current.child_ids[nextIndex];
        current = currentNodes.get(leafId);
      }

      switchBranch(leafId);
    },
    [
      animationsEnabled,
      branchSwitchAnimation,
      containerRef,
      getChatSnapshot,
      skipAutoScrollRef,
      switchBranch,
    ]
  );

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    const container = containerRef.current;

    if (!anchor || !container) return;

    pendingScrollAnchor.current = null;

    const parentIndex = activeNodeIds.findIndex((id) => id === anchor.parentId);
    if (parentIndex === -1 || parentIndex >= activeNodeIds.length - 1) return;

    const newSiblingId = activeNodeIds[parentIndex + 1];
    const anchorElement = container.querySelector(`[data-node-id="${newSiblingId}"]`) as HTMLElement | null;
    if (!anchorElement) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = anchorElement.getBoundingClientRect();
    const currentOffsetFromTop = elementRect.top - containerRect.top;

    const scrollDelta = currentOffsetFromTop - anchor.offsetFromTop;
    const targetScrollTop = container.scrollTop + scrollDelta;

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const minScrollTop = 0;

    if (targetScrollTop >= minScrollTop && targetScrollTop <= maxScrollTop) {
      const prevScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = targetScrollTop;
      container.style.scrollBehavior = prevScrollBehavior;
    } else {
      const clampedScrollTop = Math.max(minScrollTop, Math.min(maxScrollTop, targetScrollTop));
      const prevScrollBehavior = container.style.scrollBehavior;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = clampedScrollTop;
      container.style.scrollBehavior = prevScrollBehavior;

      const overshoot = targetScrollTop - clampedScrollTop;

      if (Math.abs(overshoot) > 1) {
        container.style.transition = 'none';
        container.style.transform = `translateY(${-overshoot}px)`;

        void container.offsetHeight;

        container.style.transition = 'transform 300ms ease-out';
        container.style.transform = 'translateY(0)';

        const cleanup = () => {
          container.style.transition = '';
          container.style.transform = '';
          container.removeEventListener('transitionend', cleanup);
        };
        container.addEventListener('transitionend', cleanup);
        setTimeout(cleanup, 350);
      }
    }
  }, [activeNodeIds, containerRef]);

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
  }, [activeNodeIds, skipAutoScrollRef]);

  useEffect(() => {
    if (branchAnimation?.active) {
      const timer = setTimeout(() => {
        setBranchAnimation(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [branchAnimation]);

  const shouldAnimateMessage = useCallback(
    (nodeIndex: number): boolean => {
      if (!branchAnimation?.active) return false;
      if (branchSwitchAnimation === 'none') return false;

      if (activeNodeIds.includes(branchAnimation.oldSiblingId)) return false;

      const parentIndex = activeNodeIds.indexOf(branchAnimation.parentId);
      return parentIndex !== -1 && nodeIndex > parentIndex;
    },
    [activeNodeIds, branchAnimation, branchSwitchAnimation]
  );

  const getAnimationClass = useCallback(
    (nodeIndex: number): string => {
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
    },
    [branchAnimation, branchSwitchAnimation, shouldAnimateMessage]
  );

  return {
    branchAnimation,
    handleSwitchBranch,
    handleCreateBranch,
    getAnimationClass,
  };
}
