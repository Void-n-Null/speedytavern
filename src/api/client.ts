/**
 * API client for server communication.
 * All functions return typed responses.
 */

import type { ChatNode, Speaker } from '../types/chat';
import type { MessageStyleConfig } from '../types/messageStyle';

const API_BASE = '/api';

// ============ Types ============

export interface ChatMeta {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface ChatFull {
  id: string;
  name: string;
  nodes: ChatNode[];
  rootId: string | null;
  tailId: string | null;
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

  get: (id: string) => api<ChatFull>(`/chats/${id}`),

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
    isBot: boolean
  ) =>
    api<{ id: string; created_at: number }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ parentId, content, speakerId, isBot }),
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
