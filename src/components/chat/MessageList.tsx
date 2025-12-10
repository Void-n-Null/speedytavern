import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageItem } from './MessageItem';

/**
 * Message list container with optimizations.
 * 
 * Optimization strategies:
 * 1. Memoized active path computation (via store)
 * 2. Stable callback references (useCallback)
 * 3. Sibling info computed once per render
 * 4. Auto-scroll to bottom on new messages
 * 
 * Future optimizations:
 * - Virtual scrolling for 1000+ messages (react-virtual)
 * - Intersection observer for lazy image loading
 * - Web worker for heavy computations
 */
export function MessageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Select only what we need from store
  const nodes = useChatStore((s) => s.nodes);
  const speakers = useChatStore((s) => s.speakers);
  const getActivePath = useChatStore((s) => s.getActivePath);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const switchBranch = useChatStore((s) => s.switchBranch);

  // Get active path (cached in store)
  const activePath = getActivePath();

  // Compute sibling info for each node in path
  const nodesWithSiblingInfo = useMemo(() => {
    return activePath.nodes.map((node) => {
      // Get parent to find siblings
      const parent = node.parent_id ? nodes.get(node.parent_id) : null;
      const siblingIds = parent?.child_ids ?? [node.id];
      const siblingCount = siblingIds.length;
      const currentSiblingIndex = siblingIds.indexOf(node.id);
      
      // Check if first in consecutive group (same speaker)
      const nodeIndex = activePath.nodes.indexOf(node);
      const prevNode = nodeIndex > 0 ? activePath.nodes[nodeIndex - 1] : null;
      const isFirstInGroup = !prevNode || prevNode.speaker_id !== node.speaker_id;

      return {
        node,
        siblingCount,
        currentSiblingIndex,
        isFirstInGroup,
      };
    });
  }, [activePath.nodes, nodes]);

  // Stable callbacks
  const handleEdit = useCallback((nodeId: string, content: string) => {
    editMessage(nodeId, content);
  }, [editMessage]);

  const handleDelete = useCallback((nodeId: string) => {
    deleteMessage(nodeId);
  }, [deleteMessage]);

  const handleBranch = useCallback((nodeId: string) => {
    // For now, just log - will implement branch creation UI
    console.log('Create branch from:', nodeId);
  }, []);

  const handleRegenerate = useCallback((nodeId: string) => {
    // Will trigger AI regeneration
    console.log('Regenerate:', nodeId);
  }, []);

  const handleSwitchBranch = useCallback((nodeId: string, direction: 'prev' | 'next') => {
    performance.mark('branch-switch-start');
    const traversalStart = performance.now();
    
    const node = nodes.get(nodeId);
    if (!node?.parent_id) return;

    const parent = nodes.get(node.parent_id);
    if (!parent) return;

    const currentIndex = parent.child_ids.indexOf(nodeId);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= parent.child_ids.length) return;

    const targetSiblingId = parent.child_ids[newIndex];
    
    // Find the leaf of the target sibling's branch by following active_child_index
    // This is O(depth) as per our design in MessageTree.md
    let leafId = targetSiblingId;
    let current = nodes.get(leafId);
    let depth = 0;
    
    while (current && current.child_ids.length > 0) {
      // Follow the active child, or default to first child
      const nextIndex = current.active_child_index ?? 0;
      leafId = current.child_ids[nextIndex];
      current = nodes.get(leafId);
      depth++;
    }

    const traversalElapsed = performance.now() - traversalStart;
    
    // Switch branch - this updates active_child_index on all ancestors
    // O(depth) operation as designed
    performance.mark('branch-switch-set-start');
    switchBranch(leafId);
    performance.mark('branch-switch-end');
    performance.measure('branch-switch-total', 'branch-switch-start', 'branch-switch-end');
    performance.measure('branch-switch-traversal', 'branch-switch-start', 'branch-switch-set-start');

    const total = performance.getEntriesByName('branch-switch-total').pop()?.duration ?? 0;
    const traversal = performance.getEntriesByName('branch-switch-traversal').pop()?.duration ?? traversalElapsed;

    console.log(
      `Branch switch: total=${total.toFixed(2)}ms, traversal=${traversal.toFixed(2)}ms, depth=${depth}`
    );

    // Clear measures to avoid unbounded performance entry list
    performance.clearMarks('branch-switch-start');
    performance.clearMarks('branch-switch-set-start');
    performance.clearMarks('branch-switch-end');
    performance.clearMeasures('branch-switch-total');
    performance.clearMeasures('branch-switch-traversal');
  }, [nodes, switchBranch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activePath.node_ids.length]);

  return (
    <div className="message-list" ref={containerRef}>
      {nodesWithSiblingInfo.map(({ node, siblingCount, currentSiblingIndex, isFirstInGroup }) => {
        const speaker = speakers.get(node.speaker_id);
        if (!speaker) return null;

        return (
          <MessageItem
            key={node.id}
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
          />
        );
      })}
    </div>
  );
}
