import { memo, useMemo } from 'react';
import { useEtherealMessage } from '../../store/streamingStore';
import { useServerChat } from '../../hooks/queries';
import { MessageItem } from './MessageItem';
import type { ChatNode, Speaker } from '../../types/chat';

/**
 * Renders the ethereal (streaming) message at the tail of the chat.
 * 
 * Reuses MessageItem with a synthetic node created from ethereal data.
 * Auto-hides when persistent version exists (seamless swap).
 */
export const EtherealMessage = memo(function EtherealMessage() {
  const ethereal = useEtherealMessage();
  const { speakers, nodes, tailId } = useServerChat();
  
  // Check if persistent version already exists
  // If the tail node has the same parent and speaker as ethereal, it's the persisted version
  const persistentExists = useMemo(() => {
    if (!ethereal || !tailId) return false;
    const tailNode = nodes.get(tailId);
    if (!tailNode) return false;
    
    // If tail's parent matches ethereal's parent and speaker matches, persistent version exists
    return tailNode.parent_id === ethereal.parentId && 
           tailNode.speaker_id === ethereal.speakerId;
  }, [ethereal, tailId, nodes]);
  
  // Create synthetic node from ethereal data
  const syntheticNode: ChatNode | null = useMemo(() => {
    if (!ethereal) return null;
    return {
      id: '__ethereal__',
      parent_id: ethereal.parentId,
      child_ids: [],
      active_child_index: null,
      speaker_id: ethereal.speakerId,
      message: ethereal.content,
      is_bot: true,
      created_at: ethereal.startedAt,
    };
  }, [ethereal]);
  
  const speaker: Speaker | null = useMemo(() => {
    if (!ethereal) return null;
    return speakers.get(ethereal.speakerId) ?? {
      id: ethereal.speakerId,
      name: 'Bot',
      is_user: false,
      color: '#9b59b6',
    };
  }, [ethereal, speakers]);
  
  // Early return if not streaming OR persistent version already exists
  if (!syntheticNode || !speaker || persistentExists) return null;
  
  // No-op handlers for ethereal message (can't edit/delete/etc a streaming message)
  const noopSingle = (_nodeId: string) => {};
  const noopEdit = (_nodeId: string, _content: string) => {};
  const noopSwitch = (_nodeId: string, _direction: 'prev' | 'next') => {};
  
  return (
    <div className="message-ethereal-wrapper" style={{ opacity: 0.9 }}>
      <MessageItem
        node={syntheticNode}
        speaker={speaker}
        isFirstInGroup={true}
        siblingCount={1}
        currentSiblingIndex={0}
        onEdit={noopEdit}
        onDelete={noopSingle}
        onRegenerate={noopSingle}
        onBranch={noopSingle}
        onSwitchBranch={noopSwitch}
        onCreateBranch={noopSingle}
      />
    </div>
  );
});
