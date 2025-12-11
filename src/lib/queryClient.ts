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
};
