import { useCallback } from 'react';

interface ChatNode {
  speaker_id: string;
  message: string;
  parent_id: string | null;
}

interface Speaker {
  id: string;
  is_user: boolean;
}

export function useChatComposerEvents(
  nodes: Map<string, ChatNode>,
  speakers: Map<string, Speaker>,
  tailId: string | null
) {
  const getLastUserMessage = useCallback((): string | null => {
    let currentId: string | null = tailId;
    while (currentId) {
      const node = nodes.get(currentId);
      if (!node) break;
      const sp = speakers.get(node.speaker_id);
      if (sp?.is_user && node.message.trim()) return node.message;
      currentId = node.parent_id;
    }
    return null;
  }, [nodes, speakers, tailId]);

  return {
    getLastUserMessage,
  };
}

