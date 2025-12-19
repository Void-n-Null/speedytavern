import { api } from './base';

// ============ AI Providers (DEV/admin) ============

export type AiProviderAuthStrategyStatus = {
  id: string;
  type: string;
  label: string;
  configured: boolean;
  presentKeys: string[];
  requiredKeys: string[];
};

export type AiProviderStatus = {
  id: string;
  label: string;
  config: unknown | null;
  configValid: boolean;
  authStrategies: AiProviderAuthStrategyStatus[];
  connection?: {
    provider_id: string;
    auth_strategy_id: string | null;
    status: string;
    last_validated_at: number | null;
    last_error: string | null;
    updated_at: number;
  };
};

export const aiProviders = {
  list: () => api<{ providers: AiProviderStatus[] }>('/ai/providers'),

  setConfig: (providerId: string, config: unknown) =>
    api<{ success: boolean }>(`/ai/providers/${providerId}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  setSecrets: (providerId: string, authStrategyId: string, secrets: Record<string, string>) =>
    api<{ success: boolean }>(`/ai/providers/${providerId}/secrets/${authStrategyId}`, {
      method: 'PUT',
      body: JSON.stringify(secrets),
    }),

  connect: (providerId: string, authStrategyId: string) =>
    api<{ success: boolean }>(`/ai/providers/${providerId}/connect`, {
      method: 'POST',
      body: JSON.stringify({ authStrategyId }),
    }),

  disconnect: (providerId: string) =>
    api<{ success: boolean }>(`/ai/providers/${providerId}/disconnect`, {
      method: 'POST',
    }),

  listModels: (providerId: string) =>
    api<{ models: { id: string; label: string }[] }>(`/ai/providers/${providerId}/models`),

  startOpenRouterPkce: (returnUrl: string) =>
    api<{ authUrl: string; state: string }>(`/ai/providers/openrouter/pkce/start`, {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    }),
};

// ============ OpenRouter Models ============

export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  image: string;
  request: string;
}

export interface OpenRouterModelEndpoint {
  id: string;
  name: string;
  context_length: number;
  provider_name: string;
  provider_display_name: string;
  pricing: OpenRouterModelPricing;
  is_free: boolean;
  supports_reasoning: boolean;
  supports_multipart: boolean;
  max_completion_tokens: number | null;
}

export interface OpenRouterModel {
  slug: string;
  name: string;
  short_name: string;
  author: string;
  description: string;
  context_length: number;
  input_modalities: string[];
  output_modalities: string[];
  group: string;
  supports_reasoning: boolean;
  hidden: boolean;
  permaslug: string;
  endpoint?: OpenRouterModelEndpoint;
}

export const openRouterModels = {
  list: () => api<{ models: OpenRouterModel[]; cached: boolean }>('/ai/models/openrouter'),
  
  refresh: () => api<{ success: boolean; count: number }>('/ai/models/openrouter/refresh', {
    method: 'POST',
  }),
};

// ============ AI Request Logs ============

export interface AiRequestLog {
  id: string;
  provider_id: string;
  model_slug: string;
  input_tokens: number | null;
  output_tokens: number | null;
  calculated_cost_usd: number | null;
  latency_ms: number | null;
  status: 'success' | 'error';
  error_message: string | null;
  request_metadata: Record<string, unknown> | null;
  created_at: number;
}

export interface CostSummary {
  totalCostUsd: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgCostPerRequest: number;
  avgLatencyMs: number;
}

export interface ModelCostBreakdown {
  modelSlug: string;
  totalCostUsd: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface DailyCostTrend {
  date: string;
  totalCostUsd: number;
  requestCount: number;
}

export const aiRequestLogs = {
  list: (options?: {
    limit?: number;
    offset?: number;
    providerId?: string;
    modelSlug?: string;
    status?: 'success' | 'error';
    startDate?: number;
    endDate?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.providerId) params.set('providerId', options.providerId);
    if (options?.modelSlug) params.set('modelSlug', options.modelSlug);
    if (options?.status) params.set('status', options.status);
    if (options?.startDate) params.set('startDate', String(options.startDate));
    if (options?.endDate) params.set('endDate', String(options.endDate));
    const query = params.toString();
    return api<{ logs: AiRequestLog[]; total: number }>(`/ai/logs${query ? `?${query}` : ''}`);
  },

  getSummary: (options?: {
    providerId?: string;
    startDate?: number;
    endDate?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.providerId) params.set('providerId', options.providerId);
    if (options?.startDate) params.set('startDate', String(options.startDate));
    if (options?.endDate) params.set('endDate', String(options.endDate));
    const query = params.toString();
    return api<CostSummary>(`/ai/logs/summary${query ? `?${query}` : ''}`);
  },

  getByModel: (options?: {
    providerId?: string;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.providerId) params.set('providerId', options.providerId);
    if (options?.startDate) params.set('startDate', String(options.startDate));
    if (options?.endDate) params.set('endDate', String(options.endDate));
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    return api<ModelCostBreakdown[]>(`/ai/logs/by-model${query ? `?${query}` : ''}`);
  },

  getTrend: (options?: {
    providerId?: string;
    days?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.providerId) params.set('providerId', options.providerId);
    if (options?.days) params.set('days', String(options.days));
    const query = params.toString();
    return api<DailyCostTrend[]>(`/ai/logs/trend${query ? `?${query}` : ''}`);
  },

  getErrors: (options?: {
    providerId?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.providerId) params.set('providerId', options.providerId);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    return api<AiRequestLog[]>(`/ai/logs/errors${query ? `?${query}` : ''}`);
  },

  cleanup: (days?: number) => {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    const query = params.toString();
    return api<{ deleted: number; message: string }>(`/ai/logs/cleanup${query ? `?${query}` : ''}`, {
      method: 'DELETE',
    });
  },
};

