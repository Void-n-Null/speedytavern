import type { Speaker } from '../types/chat';
import { api, API_BASE } from './base';

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

// ============ Health ============

export const health = {
  check: () => api<{ status: string; timestamp: number }>('/health'),
};

// ============ Default Chat ============

export const defaultChat = {
  getId: () => api<{ id: string }>('/default-chat'),
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


