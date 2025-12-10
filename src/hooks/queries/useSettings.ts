/**
 * TanStack Query hooks for settings operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { settings } from '../../api/client';
import type { MessageStyleConfig } from '../../types/messageStyle';

// ============ Queries ============

/** Fetch all settings */
export function useAllSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settings.getAll(),
  });
}

/** Fetch a specific setting */
export function useSetting<T>(key: string) {
  return useQuery({
    queryKey: queryKeys.settings.detail(key),
    queryFn: () => settings.get<T>(key).then(r => r.value),
  });
}

/** Fetch message style config specifically */
export function useMessageStyleConfig() {
  return useQuery({
    queryKey: queryKeys.settings.detail('messageStyle'),
    queryFn: () => settings.getMessageStyle(),
    // Use default config if not found
    placeholderData: undefined,
  });
}

// ============ Mutations ============

/** Update a setting */
export function useUpdateSetting<T>() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: T }) =>
      settings.set(key, value),
    onSuccess: (_, { key, value }) => {
      // Update cache
      queryClient.setQueryData(queryKeys.settings.detail(key), value);
      // Invalidate all settings
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

/** Update message style config with optimistic update */
export function useUpdateMessageStyle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: MessageStyleConfig) => settings.setMessageStyle(config),
    
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.settings.detail('messageStyle') 
      });
      
      const previous = queryClient.getQueryData<MessageStyleConfig>(
        queryKeys.settings.detail('messageStyle')
      );
      
      queryClient.setQueryData(
        queryKeys.settings.detail('messageStyle'),
        newConfig
      );
      
      return { previous };
    },
    
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.settings.detail('messageStyle'),
          context.previous
        );
      }
    },
  });
}

/** Bulk update settings */
export function useBulkUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => settings.setAll(data),
    onSuccess: () => {
      // Invalidate all settings queries
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}
