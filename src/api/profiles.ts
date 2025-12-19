import type { Profile, ProfileMeta, AiConfig, CreateProfileRequest, UpdateProfileRequest } from '../types/profile';
import { api } from './base';

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

  addAiConfig: (profileId: string, data: {
    name: string;
    providerId: string;
    authStrategyId: string;
    modelId: string;
    params?: Record<string, unknown>;
    providerConfig?: Record<string, unknown>;
    isDefault?: boolean;
  }) =>
    api<AiConfig>(`/profiles/${profileId}/ai-configs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAiConfig: (profileId: string, configId: string, data: {
    name?: string;
    modelId?: string;
    authStrategyId?: string;
    params?: Record<string, unknown>;
    providerConfig?: Record<string, unknown>;
    isDefault?: boolean;
  }) =>
    api<AiConfig>(`/profiles/${profileId}/ai-configs/${configId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAiConfig: (profileId: string, configId: string) =>
    api<{ success: boolean }>(`/profiles/${profileId}/ai-configs/${configId}`, {
      method: 'DELETE',
    }),
};

