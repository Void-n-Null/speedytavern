import { api } from './base';
import type { CharacterCardRecord, CharacterCardRecordMeta } from '../types/characterCard';

const BASE_PATH = '/character-cards';

export const characterCards = {
  list: () => api<CharacterCardRecordMeta[]>(BASE_PATH),

  get: (id: string) => api<CharacterCardRecord>(`${BASE_PATH}/${id}`),

  create: (card: Record<string, unknown>) =>
    api<CharacterCardRecord>(BASE_PATH, {
      method: 'POST',
      body: JSON.stringify(card),
    }),

  update: (id: string, card: Record<string, unknown>) =>
    api<CharacterCardRecord>(`${BASE_PATH}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(card),
    }),

  delete: (id: string) =>
    api<{ success: boolean; deleted: string }>(`${BASE_PATH}/${id}`, {
      method: 'DELETE',
    }),

  updateTokenCount: (id: string, token_count: number) =>
    api<{ success: boolean; token_count: number; token_count_updated_at: number }>(
      `${BASE_PATH}/${id}/token-count`,
      {
        method: 'PATCH',
        body: JSON.stringify({ token_count }),
      }
    ),

  updateAvatar: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<{ success: boolean; png_sha256: string }>(`${BASE_PATH}/${id}/avatar`, {
      method: 'PATCH',
      body: formData,
    });
  },

  deleteAvatar: (id: string) =>
    api<{ success: boolean }>(`${BASE_PATH}/${id}/avatar`, {
      method: 'DELETE',
    }),

  importPng: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<CharacterCardRecord>(`${BASE_PATH}/import/png`, {
      method: 'POST',
      body: formData,
    });
  },

  importJson: (json: Record<string, unknown>) =>
    api<CharacterCardRecord>(`${BASE_PATH}/import/json`, {
      method: 'POST',
      body: JSON.stringify(json),
    }),

  getAvatarUrl: (id: string, version?: string | null) => {
    const url = `${BASE_PATH}/${id}/avatar`;
    return version ? `${url}?v=${encodeURIComponent(version)}` : url;
  },

  getExportPngUrl: (id: string) => `${BASE_PATH}/${id}/export/png`,
  getExportJsonUrl: (id: string) => `${BASE_PATH}/${id}/export/json`,
};

