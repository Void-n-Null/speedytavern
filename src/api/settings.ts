import type { MessageStyleConfig } from '../types/messageStyle';
import { api } from './base';

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


