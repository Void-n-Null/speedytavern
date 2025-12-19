import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { profiles } from '../../../api/client';
import type { Profile, ProfileMeta, CreateProfileRequest, UpdateProfileRequest } from '../../../types/profile';

// ============ Mutations ============

/** Create a new profile */
export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProfileRequest) => profiles.create(data),
    onSuccess: (newProfile) => {
      // Add to list cache
      queryClient.setQueryData<ProfileMeta[]>(
        queryKeys.profiles.list(),
        (old) => {
          const meta: ProfileMeta = {
            id: newProfile.id,
            name: newProfile.name,
            isDefault: newProfile.isDefault,
            createdAt: newProfile.createdAt,
            updatedAt: newProfile.updatedAt,
          };
          return old ? [meta, ...old] : [meta];
        }
      );
      // If it's the new default, update active cache
      if (newProfile.isDefault) {
        queryClient.setQueryData(queryKeys.profiles.active(), newProfile);
        // Update isDefault flags in list
        queryClient.setQueryData<ProfileMeta[]>(
          queryKeys.profiles.list(),
          (old) => old?.map(p => ({ ...p, isDefault: p.id === newProfile.id }))
        );
      }
    },
  });
}

/** Update an existing profile */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileRequest }) =>
      profiles.update(id, data),

    // Optimistic update - apply changes immediately to avoid UI whiplash
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.profiles.active() });
      await queryClient.cancelQueries({ queryKey: queryKeys.profiles.detail(id) });

      // Snapshot current values for rollback
      const previousActive = queryClient.getQueryData<Profile>(queryKeys.profiles.active());
      const previousDetail = queryClient.getQueryData<Profile>(queryKeys.profiles.detail(id));

      // Optimistically update the caches
      const optimisticUpdate = (old: Profile | undefined): Profile | undefined => {
        if (!old || old.id !== id) return old;
        return {
          ...old,
          ...data,
          messageStyle: data.messageStyle
            ? { ...old.messageStyle, ...data.messageStyle }
            : old.messageStyle,
          updatedAt: Date.now(),
        };
      };

      queryClient.setQueryData<Profile>(queryKeys.profiles.active(), optimisticUpdate);
      queryClient.setQueryData<Profile>(queryKeys.profiles.detail(id), optimisticUpdate);

      // Return context for rollback
      return { previousActive, previousDetail, id };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousActive) {
        queryClient.setQueryData(queryKeys.profiles.active(), context.previousActive);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.profiles.detail(context.id), context.previousDetail);
      }
    },

    // On success, update with server response (source of truth)
    onSuccess: (updatedProfile) => {
      // Update detail cache with server response
      queryClient.setQueryData(
        queryKeys.profiles.detail(updatedProfile.id),
        updatedProfile
      );
      // Update list cache
      queryClient.setQueryData<ProfileMeta[]>(
        queryKeys.profiles.list(),
        (old) => old?.map(p =>
          p.id === updatedProfile.id
            ? {
                id: updatedProfile.id,
                name: updatedProfile.name,
                isDefault: updatedProfile.isDefault,
                createdAt: updatedProfile.createdAt,
                updatedAt: updatedProfile.updatedAt,
              }
            : p
        )
      );
      // If this is the active profile, update active cache with server response
      if (updatedProfile.isDefault) {
        queryClient.setQueryData(queryKeys.profiles.active(), updatedProfile);
      }
    },
  });
}

/** Delete a profile */
export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => profiles.delete(id),
    onSuccess: (_, id) => {
      // Remove from list cache
      queryClient.setQueryData<ProfileMeta[]>(
        queryKeys.profiles.list(),
        (old) => old?.filter(p => p.id !== id)
      );
      // Remove detail cache
      queryClient.removeQueries({ queryKey: queryKeys.profiles.detail(id) });
      // Invalidate active profile in case it changed
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.list() });
    },
  });
}

/** Activate a profile (set as default) */
export function useActivateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => profiles.activate(id),
    onSuccess: (_, id) => {
      // Update isDefault flags in list cache
      queryClient.setQueryData<ProfileMeta[]>(
        queryKeys.profiles.list(),
        (old) => old?.map(p => ({ ...p, isDefault: p.id === id }))
      );
      // Invalidate active profile to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.active() });
    },
  });
}

/** Add an AI config to a profile */
export function useCreateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { 
      profileId: string; 
      data: {
        name: string;
        providerId: string;
        authStrategyId: string;
        modelId: string;
        params?: Record<string, unknown>;
        providerConfig?: Record<string, unknown>;
        isDefault?: boolean;
      } 
    }) => profiles.addAiConfig(profileId, data),
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(profileId) });
    },
  });
}

/** Update an AI config in a profile */
export function useUpdateAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, configId, data }: { 
      profileId: string; 
      configId: string;
      data: {
        name?: string;
        modelId?: string;
        authStrategyId?: string;
        params?: Record<string, unknown>;
        providerConfig?: Record<string, unknown>;
        isDefault?: boolean;
      } 
    }) => profiles.updateAiConfig(profileId, configId, data),
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(profileId) });
    },
  });
}

/** Delete an AI config from a profile */
export function useDeleteAiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, configId }: { profileId: string; configId: string }) =>
      profiles.deleteAiConfig(profileId, configId),
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(profileId) });
    },
  });
}
