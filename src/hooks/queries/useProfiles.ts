/**
 * TanStack Query hooks for profile operations.
 * Profiles store MessageStyleConfig for UI customization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { profiles } from '../../api/client';
import type { Profile, ProfileMeta, CreateProfileRequest, UpdateProfileRequest } from '../../types/profile';
import type { MessageStyleConfig, TypographyConfig, LayoutConfig, AvatarConfig, ActionsConfig, BranchConfig, TimestampConfig, AnimationConfig, EditConfig, PageBackgroundConfig, MessageListBackgroundConfig } from '../../types/messageStyle';
import { defaultTypography, defaultLayout, defaultAvatar, defaultActions, defaultBranch, defaultTimestamp, defaultAnimation, defaultEdit, defaultPageBackground, defaultMessageListBackground, defaultMessageStyleConfig } from '../../types/messageStyle';

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
  
  const setMessageListBackground = (messageListBackground: Partial<MessageStyleConfig['messageListBackground']>) => {
    if (!config) return;
    return updateConfig({
      messageListBackground: { ...config.messageListBackground, ...messageListBackground },
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
    setMessageListBackground,
    resetConfig,
    updateConfig,
  };
}

// ============ Config Selector Hooks ============
// These provide fine-grained reactivity - components only re-render when their specific section changes.
// TanStack Query's structural sharing ensures reference stability.

/** Typography config with defaults */
export function useTypographyConfig(): TypographyConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.typography ?? defaultTypography,
  });
  return data ?? defaultTypography;
}

/** Layout config with defaults */
export function useLayoutConfig(): LayoutConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.layout ?? defaultLayout,
  });
  return data ?? defaultLayout;
}

/** Avatar config with defaults */
export function useAvatarConfig(): AvatarConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.avatar ?? defaultAvatar,
  });
  return data ?? defaultAvatar;
}

/** Actions config with defaults */
export function useActionsConfig(): ActionsConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.actions ?? defaultActions,
  });
  return data ?? defaultActions;
}

/** Branch indicator config with defaults */
export function useBranchConfig(): BranchConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.branch ?? defaultBranch,
  });
  return data ?? defaultBranch;
}

/** Timestamp config with defaults */
export function useTimestampConfig(): TimestampConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.timestamp ?? defaultTimestamp,
  });
  return data ?? defaultTimestamp;
}

/** Animation config with defaults */
export function useAnimationConfig(): AnimationConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.animation ?? defaultAnimation,
  });
  return data ?? defaultAnimation;
}

/** Edit config with defaults */
export function useEditConfig(): EditConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.edit ?? defaultEdit,
  });
  return data ?? defaultEdit;
}

/** Page background config with defaults */
export function usePageBackgroundConfig(): PageBackgroundConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.pageBackground ?? defaultPageBackground,
  });
  return data ?? defaultPageBackground;
}

/** Message list background config with defaults */
export function useMessageListBackgroundConfig(): MessageListBackgroundConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle?.messageListBackground ?? defaultMessageListBackground,
  });
  return data ?? defaultMessageListBackground;
}

/** Full message style config with defaults */
export function useFullConfig(): MessageStyleConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.messageStyle ?? defaultMessageStyleConfig,
  });
  return data ?? defaultMessageStyleConfig;
}
