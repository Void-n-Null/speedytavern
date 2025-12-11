/**
 * API client for server communication.
 * All functions return typed responses.
 */

import type { ChatNode, Speaker } from '../types/chat';
import type { MessageStyleConfig } from '../types/messageStyle';
import type { Profile, ProfileMeta, CreateProfileRequest, UpdateProfileRequest } from '../types/profile';

const API_BASE = '/api';

// ============ Types ============

export interface ChatMeta {
  id: string;
  name: string;
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
    nodes,
    speakers: wire.speakers,  // Pass through speakers
    rootId: wire.rootId,
    tailId: wire.tailId,
  };
}

// ============ Generic Fetch ============

async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  return res.json();
}

// ============ Chats ============

export const chats = {
  list: () => api<ChatMeta[]>('/chats'),

  // Fetches compact wire format, hydrates to full ChatNode objects
  get: async (id: string): Promise<ChatFull> => {
    const wire = await api<ChatFullWire>(`/chats/${id}`);
    return hydrateChatNodes(wire);
  },

  create: (name: string) =>
    api<ChatMeta>('/chats', {
      method: 'POST',
      body: JSON.stringify({ name }),
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
    createdAt?: number
  ) =>
    api<{ id: string; created_at: number }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ parentId, content, speakerId, isBot, createdAt }),
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

// ============ Speakers ============

export const speakers = {
  list: () => api<Speaker[]>('/speakers'),

  get: (id: string) => api<Speaker>(`/speakers/${id}`),

  create: (speaker: Omit<Speaker, 'id'>) =>
    api<Speaker>('/speakers', {
      method: 'POST',
      body: JSON.stringify(speaker),
    }),

  update: (id: string, data: Partial<Omit<Speaker, 'id'>>) =>
    api<{ success: boolean }>(`/speakers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/speakers/${id}`, { method: 'DELETE' }),
};

// ============ Settings ============

export const settings = {
  getAll: () => api<Record<string, unknown>>('/settings'),

  get: <T>(key: string) =>
    api<{ key: string; value: T; updated_at: number }>(`/settings/${key}`),

  set: <T>(key: string, value: T) =>
    api<{ success: boolean; updated_at: number }>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  setAll: (data: Record<string, unknown>) =>
    api<{ success: boolean; updated_at: number }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (key: string) =>
    api<{ success: boolean }>(`/settings/${key}`, { method: 'DELETE' }),

  // Convenience methods for known settings
  getMessageStyle: () =>
    settings.get<MessageStyleConfig>('messageStyle').then((r) => r.value),

  setMessageStyle: (config: MessageStyleConfig) =>
    settings.set('messageStyle', config),
};

// ============ Health ============

export const health = {
  check: () => api<{ status: string; timestamp: number }>('/health'),
};

// ============ Default Chat ============

export const defaultChat = {
  getId: () => api<{ id: string }>('/default-chat'),
};

// ============ Profiles ============

export const profiles = {
  list: () => api<ProfileMeta[]>('/profiles'),

  get: (id: string) => api<Profile>(`/profiles/${id}`),

  getActive: () => api<Profile>('/profiles/active'),

  create: (data: CreateProfileRequest) =>
    api<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateProfileRequest) =>
    api<Profile>(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/profiles/${id}`, { method: 'DELETE' }),

  activate: (id: string) =>
    api<{ success: boolean; updatedAt: number }>(`/profiles/${id}/activate`, {
      method: 'POST',
    }),
};

// ============ Design Templates ============

export interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  config: Record<string, unknown>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

export const designTemplates = {
  list: () => api<DesignTemplate[]>('/design-templates'),
  
  get: (id: string) => api<DesignTemplate>(`/design-templates/${id}`),
  
  create: (data: CreateTemplateInput) =>
    api<DesignTemplate>('/design-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: UpdateTemplateInput) =>
    api<DesignTemplate>(`/design-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    api<{ success: boolean }>(`/design-templates/${id}`, { method: 'DELETE' }),
};

// ============ Custom Fonts ============

export interface FontMeta {
  id: string;
  name: string;
  filename: string;
  format: string;
  createdAt: number;
}

export const fonts = {
  list: () => api<FontMeta[]>('/fonts'),

  get: (id: string) => api<FontMeta>(`/fonts/${id}`),

  getFileUrl: (id: string) => `${API_BASE}/fonts/${id}/file`,

  upload: async (file: File, name?: string): Promise<FontMeta> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    const res = await fetch(`${API_BASE}/fonts`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || 'Font upload failed');
    }

    return res.json();
  },

  rename: (id: string, name: string) =>
    api<FontMeta>(`/fonts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/fonts/${id}`, { method: 'DELETE' }),
};
