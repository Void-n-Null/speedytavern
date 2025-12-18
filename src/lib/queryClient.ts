import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry once on failure
      retry: 1,
      // Refetch on window focus
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys factory for type-safe, consistent keys
export const queryKeys = {
  // Chats
  chats: {
    all: ['chats'] as const,
    list: () => [...queryKeys.chats.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.chats.all, 'detail', id] as const,
  },
  
  // Speakers
  speakers: {
    all: ['speakers'] as const,
    list: () => [...queryKeys.speakers.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.speakers.all, 'detail', id] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    detail: (key: string) => [...queryKeys.settings.all, key] as const,
  },
  
  // Profiles
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.profiles.all, 'detail', id] as const,
    active: () => [...queryKeys.profiles.all, 'active'] as const,
  },

  // AI providers (server-side schemas + connection status)
  aiProviders: {
    all: ['aiProviders'] as const,
    list: () => [...queryKeys.aiProviders.all, 'list'] as const,
  },

  // OpenRouter models catalog
  openRouterModels: {
    all: ['openRouterModels'] as const,
    list: () => [...queryKeys.openRouterModels.all, 'list'] as const,
  },

  // AI request logs
  aiRequestLogs: {
    all: ['aiRequestLogs'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.aiRequestLogs.all, 'list', filters] as const,
    summary: (filters?: Record<string, unknown>) => [...queryKeys.aiRequestLogs.all, 'summary', filters] as const,
    byModel: (filters?: Record<string, unknown>) => [...queryKeys.aiRequestLogs.all, 'byModel', filters] as const,
    trend: (filters?: Record<string, unknown>) => [...queryKeys.aiRequestLogs.all, 'trend', filters] as const,
    errors: (filters?: Record<string, unknown>) => [...queryKeys.aiRequestLogs.all, 'errors', filters] as const,
  },
};
