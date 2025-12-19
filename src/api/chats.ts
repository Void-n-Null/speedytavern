import type { ChatNode, Speaker } from '../types/chat';
import { api } from './base';

export interface ChatMeta {
  id: string;
  name: string;
  character_ids: string[];
  persona_id: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
}

// Wire format - compact nodes with speaker index instead of full UUID
interface ChatNodeWire {
  id: string;
  parent_id: string | null;
  child_ids: string[];
  active_child_index: number | null;
  s: number;  // speaker index into speakerIds array
  message: string;
  is_bot: boolean;
  created_at: number;
  updated_at?: number;
}

interface ChatFullWire {
  id: string;
  name: string;
  character_ids: string[];
  persona_id: string | null;
  tags: string[];
  speakerIds: string[];  // dictionary: index -> speaker UUID
  speakers: Speaker[];   // full speaker objects
  nodes: ChatNodeWire[];
  rootId: string | null;
  tailId: string | null;
}

// Hydrated format used by app
export interface ChatFull {
  id: string;
  name: string;
  character_ids: string[];
  persona_id: string | null;
  tags: string[];
  nodes: ChatNode[];
  speakers: Speaker[];  // speakers included with chat
  rootId: string | null;
  tailId: string | null;
}

// Hydrate wire format to full ChatNode objects
function hydrateChatNodes(wire: ChatFullWire): ChatFull {
  const nodes: ChatNode[] = wire.nodes.map(n => ({
    id: n.id,
    parent_id: n.parent_id,
    child_ids: n.child_ids,
    active_child_index: n.active_child_index,
    speaker_id: wire.speakerIds[n.s],  // Hydrate index -> UUID
    message: n.message,
    is_bot: n.is_bot,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }));
  
  return {
    id: wire.id,
    name: wire.name,
    character_ids: wire.character_ids,
    persona_id: wire.persona_id,
    tags: wire.tags,
    nodes,
    speakers: wire.speakers,  // Pass through speakers
    rootId: wire.rootId,
    tailId: wire.tailId,
  };
}

// ============ Chats ============

export const chats = {
  list: () => api<ChatMeta[]>('/chats'),

  // Fetches compact wire format, hydrates to full ChatNode objects
  get: async (id: string): Promise<ChatFull> => {
    const wire = await api<ChatFullWire>(`/chats/${id}`);
    return hydrateChatNodes(wire);
  },

  create: (params: {
    name: string;
    character_ids?: string[];
    persona_id?: string;
    tags?: string[];
  }) =>
    api<ChatMeta>('/chats', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  update: (id: string, name: string) =>
    api<{ success: boolean }>(`/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/chats/${id}`, { method: 'DELETE' }),

  addMessage: (
    chatId: string,
    parentId: string | null,
    content: string,
    speakerId: string,
    isBot: boolean,
    createdAt?: number,
    id?: string
  ) =>
    api<{ id: string; created_at: number }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ id, parentId, content, speakerId, isBot, createdAt }),
    }),

  editMessage: (chatId: string, nodeId: string, content: string) =>
    api<{ success: boolean }>(`/chats/${chatId}/messages/${nodeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (chatId: string, nodeId: string) =>
    api<{ success: boolean }>(`/chats/${chatId}/messages/${nodeId}`, {
      method: 'DELETE',
    }),

  switchBranch: (chatId: string, targetLeafId: string) =>
    api<{ success: boolean }>(`/chats/${chatId}/switch-branch`, {
      method: 'POST',
      body: JSON.stringify({ targetLeafId }),
    }),
};

