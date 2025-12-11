/**
 * TanStack Query hooks for profile operations.
 * Profiles store MessageStyleConfig for UI customization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { profiles } from '../../api/client';
import type { ProfileMeta, CreateProfileRequest, UpdateProfileRequest } from '../../types/profile';
import type { MessageStyleConfig } from '../../types/messageStyle';

// ============ Queries ============

/** Fetch list of all profiles (metadata only) */
export function useProfileList() {
  return useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () => profiles.list(),
  });
}

/** Fetch single profile with full messageStyle */
export function useProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(profileId ?? ''),
    queryFn: () => profiles.get(profileId!),
    enabled: !!profileId,
  });
}

/** Fetch the active/default profile */
export function useActiveProfile() {
  return useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
  });
}

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
    onSuccess: (updatedProfile) => {
      // Update detail cache
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
      // If this is the active profile, update active cache
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

// ============ Convenience Hooks ============

/**
 * Main hook for working with the active profile's message styles.
 * Provides the current config and section-level update functions.
 */
export function useActiveMessageStyle() {
  const { data: profile, isLoading, error } = useActiveProfile();
  const updateMutation = useUpdateProfile();
  
  const config = profile?.messageStyle;
  
  // Helper to update a section of the config
  const updateConfig = (updates: Partial<MessageStyleConfig>) => {
    if (!profile) return;
    
    const newMessageStyle: MessageStyleConfig = {
      ...profile.messageStyle,
      ...updates,
    };
    
    return updateMutation.mutateAsync({
      id: profile.id,
      data: { messageStyle: newMessageStyle },
    });
  };
  
  // Section-level update functions matching the old zustand interface
  const setTypography = (typography: Partial<MessageStyleConfig['typography']>) => {
    if (!config) return;
    return updateConfig({
      typography: { ...config.typography, ...typography },
    });
  };
  
  const setLayout = (layout: Partial<MessageStyleConfig['layout']>) => {
    if (!config) return;
    return updateConfig({
      layout: { ...config.layout, ...layout },
    });
  };
  
  const setAvatar = (avatar: Partial<MessageStyleConfig['avatar']>) => {
    if (!config) return;
    return updateConfig({
      avatar: { ...config.avatar, ...avatar },
    });
  };
  
  const setActions = (actions: Partial<MessageStyleConfig['actions']>) => {
    if (!config) return;
    return updateConfig({
      actions: { ...config.actions, ...actions },
    });
  };
  
  const setBranch = (branch: Partial<MessageStyleConfig['branch']>) => {
    if (!config) return;
    return updateConfig({
      branch: { ...config.branch, ...branch },
    });
  };
  
  const setTimestamp = (timestamp: Partial<MessageStyleConfig['timestamp']>) => {
    if (!config) return;
    return updateConfig({
      timestamp: { ...config.timestamp, ...timestamp },
    });
  };
  
  const setAnimation = (animation: Partial<MessageStyleConfig['animation']>) => {
    if (!config) return;
    return updateConfig({
      animation: { ...config.animation, ...animation },
    });
  };
  
  const setEdit = (edit: Partial<MessageStyleConfig['edit']>) => {
    if (!config) return;
    return updateConfig({
      edit: { ...config.edit, ...edit },
    });
  };
  
  const setPageBackground = (pageBackground: Partial<MessageStyleConfig['pageBackground']>) => {
    if (!config) return;
    return updateConfig({
      pageBackground: { ...config.pageBackground, ...pageBackground },
    });
  };
  
  const resetConfig = async () => {
    if (!profile) return;
    const { defaultMessageStyleConfig } = await import('../../types/messageStyle');
    return updateMutation.mutateAsync({
      id: profile.id,
      data: { messageStyle: defaultMessageStyleConfig },
    });
  };
  
  return {
    profile,
    config,
    isLoading,
    error,
    isPending: updateMutation.isPending,
    
    // Update functions
    setTypography,
    setLayout,
    setAvatar,
    setActions,
    setBranch,
    setTimestamp,
    setAnimation,
    setEdit,
    setPageBackground,
    resetConfig,
    updateConfig,
  };
}
