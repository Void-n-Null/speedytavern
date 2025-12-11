/**
 * Message Style Store - Compatibility Layer
 * 
 * This module provides the same API as the original zustand store,
 * but is now backed by server-persisted profiles via TanStack Query.
 * 
 * Components can continue using useMessageStyleStore and selector hooks
 * without modification.
 */

import { useCallback, useMemo } from 'react';
import { useActiveProfile, useUpdateProfile } from '../hooks/queries/useProfiles';
import type {
  MessageStyleConfig,
  TypographyConfig,
  LayoutConfig,
  AvatarConfig,
  ActionsConfig,
  BranchConfig,
  TimestampConfig,
  AnimationConfig,
  EditConfig,
  PageBackgroundConfig,
} from '../types/messageStyle';
import { defaultMessageStyleConfig } from '../types/messageStyle';

interface MessageStyleStore {
  config: MessageStyleConfig;
  
  // Bulk setters
  setConfig: (config: Partial<MessageStyleConfig>) => void;
  resetConfig: () => void;
  
  // Section setters
  setTypography: (typography: Partial<TypographyConfig>) => void;
  setLayout: (layout: Partial<LayoutConfig>) => void;
  setAvatar: (avatar: Partial<AvatarConfig>) => void;
  setActions: (actions: Partial<ActionsConfig>) => void;
  setBranch: (branch: Partial<BranchConfig>) => void;
  setTimestamp: (timestamp: Partial<TimestampConfig>) => void;
  setAnimation: (animation: Partial<AnimationConfig>) => void;
  setEdit: (edit: Partial<EditConfig>) => void;
  setPageBackground: (pageBackground: Partial<PageBackgroundConfig>) => void;
  
  // Speaker overrides
  setSpeakerOverride: (speakerId: string, override: Partial<MessageStyleConfig>) => void;
  clearSpeakerOverride: (speakerId: string) => void;
}

/**
 * Hook that provides the same interface as the old zustand store.
 * Supports selectors for fine-grained subscriptions.
 */
export function useMessageStyleStore<T = MessageStyleStore>(
  selector?: (store: MessageStyleStore) => T
): T {
  const { data: profile } = useActiveProfile();
  const updateMutation = useUpdateProfile();
  
  const config = profile?.messageStyle ?? defaultMessageStyleConfig;
  const profileId = profile?.id;
  
  // Create update helper
  const updateConfig = useCallback((newConfig: Partial<MessageStyleConfig>) => {
    if (!profileId) return;
    
    const updatedStyle: MessageStyleConfig = {
      ...config,
      ...newConfig,
    };
    
    updateMutation.mutate({
      id: profileId,
      data: { messageStyle: updatedStyle },
    });
  }, [profileId, config, updateMutation]);
  
  // Build the store object with all setters
  const store = useMemo<MessageStyleStore>(() => ({
    config,
    
    setConfig: (newConfig) => updateConfig(newConfig),
    
    resetConfig: () => {
      if (!profileId) return;
      updateMutation.mutate({
        id: profileId,
        data: { messageStyle: defaultMessageStyleConfig },
      });
    },
    
    setTypography: (typography) => updateConfig({
      typography: { ...config.typography, ...typography },
    }),
    
    setLayout: (layout) => updateConfig({
      layout: { ...config.layout, ...layout },
    }),
    
    setAvatar: (avatar) => updateConfig({
      avatar: { ...config.avatar, ...avatar },
    }),
    
    setActions: (actions) => updateConfig({
      actions: { ...config.actions, ...actions },
    }),
    
    setBranch: (branch) => updateConfig({
      branch: { ...config.branch, ...branch },
    }),
    
    setTimestamp: (timestamp) => updateConfig({
      timestamp: { ...config.timestamp, ...timestamp },
    }),
    
    setAnimation: (animation) => updateConfig({
      animation: { ...config.animation, ...animation },
    }),
    
    setEdit: (edit) => updateConfig({
      edit: { ...config.edit, ...edit },
    }),
    
    setPageBackground: (pageBackground) => updateConfig({
      pageBackground: { ...config.pageBackground, ...pageBackground },
    }),
    
    setSpeakerOverride: (speakerId, override) => updateConfig({
      speakerOverrides: {
        ...config.speakerOverrides,
        [speakerId]: {
          ...config.speakerOverrides[speakerId],
          ...override,
        },
      },
    }),
    
    clearSpeakerOverride: (speakerId) => {
      const { [speakerId]: _, ...rest } = config.speakerOverrides;
      updateConfig({ speakerOverrides: rest });
    },
  }), [config, profileId, updateConfig, updateMutation]);
  
  // Apply selector if provided, otherwise return full store
  if (selector) {
    return selector(store);
  }
  return store as T;
}

// Selector hooks for performance - only re-render when specific section changes
export const useTypographyConfig = () => useMessageStyleStore((s) => s.config.typography);
export const useLayoutConfig = () => useMessageStyleStore((s) => s.config.layout);
export const useAvatarConfig = () => useMessageStyleStore((s) => s.config.avatar);
export const useActionsConfig = () => useMessageStyleStore((s) => s.config.actions);
export const useBranchConfig = () => useMessageStyleStore((s) => s.config.branch);
export const useTimestampConfig = () => useMessageStyleStore((s) => s.config.timestamp);
export const useAnimationConfig = () => useMessageStyleStore((s) => s.config.animation);
export const useEditConfig = () => useMessageStyleStore((s) => s.config.edit);
export const usePageBackgroundConfig = () => useMessageStyleStore((s) => s.config.pageBackground);
export const useFullConfig = () => useMessageStyleStore((s) => s.config);
