import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageItem } from './MessageItem';

/**
 * Message list container with optimizations.
 * 
 * Optimization strategies:
 * 1. Only subscribes to node_ids array, not full nodes
 * 2. Each MessageItem subscribes to its own node (isolated re-renders)
 * 3. Stable callback references (useCallback)
 * 4. Auto-scroll to bottom on new messages
 * 
 * When a message is added/deleted:
 * - MessageList re-renders (path changed)
 * - Only NEW/REMOVED MessageItems mount/unmount
 * - Existing MessageItems don't re-render (same nodeId prop)
 * 
 * When a message is edited:
 * - MessageList does NOT re-render
 * - Only the edited MessageItem re-renders (via its own subscription)
 */
export function MessageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const nodes = useChatStore((s) => s.nodes);
  const speakers = useChatStore((s) => s.speakers);
  const getActivePath = useChatStore((s) => s.getActivePath);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const switchBranch = useChatStore((s) => s.switchBranch);

  // Get active path (cached in store)
  const activePath = getActivePath();

  // Compute sibling info for each node
  // IMPORTANT: Use node_ids from path, but look up FRESH nodes from the Map
  // This ensures we get the latest content after edits/streaming
  const pathInfo = useMemo(() => {
    return activePath.node_ids.map((nodeId, index) => {
      const node = nodes.get(nodeId)!;
      const parent = node.parent_id ? nodes.get(node.parent_id) : null;
      const siblingCount = parent?.child_ids.length ?? 1;
      const currentSiblingIndex = parent?.child_ids.indexOf(node.id) ?? 0;
      const prevNodeId = index > 0 ? activePath.node_ids[index - 1] : null;
      const prevNode = prevNodeId ? nodes.get(prevNodeId) : null;
      const isFirstInGroup = !prevNode || prevNode.speaker_id !== node.speaker_id;
      
      return {
        node,
        speaker: speakers.get(node.speaker_id)!,
        siblingCount,
        currentSiblingIndex,
        isFirstInGroup,
      };
    });
  }, [activePath.node_ids, nodes, speakers]);

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

  // STABLE callback - no dependencies that change on mutations
  // Access nodes via getState() to avoid recreating on every mutation
  const handleSwitchBranch = useCallback((nodeId: string, direction: 'prev' | 'next') => {
    const { nodes } = useChatStore.getState(); // Get current nodes at call time
    
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
    let leafId = targetSiblingId;
    let current = nodes.get(leafId);
    let depth = 0;
    
    while (current && current.child_ids.length > 0) {
      const nextIndex = current.active_child_index ?? 0;
      leafId = current.child_ids[nextIndex];
      current = nodes.get(leafId);
      depth++;
    }

    const traversalElapsed = performance.now() - traversalStart;
    
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

    performance.clearMarks('branch-switch-start');
    performance.clearMarks('branch-switch-set-start');
    performance.clearMarks('branch-switch-end');
    performance.clearMeasures('branch-switch-total');
    performance.clearMeasures('branch-switch-traversal');
  }, [switchBranch]); // Only depends on switchBranch which is stable

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activePath.node_ids.length]);

  return (
    <div className="message-list" ref={containerRef}>
      {pathInfo.map(({ node, speaker, siblingCount, currentSiblingIndex, isFirstInGroup }) => (
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
      ))}
    </div>
  );
}
