import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  
  // Speaker overrides
  setSpeakerOverride: (speakerId: string, override: Partial<MessageStyleConfig>) => void;
  clearSpeakerOverride: (speakerId: string) => void;
}

export const useMessageStyleStore = create<MessageStyleStore>()(
  persist(
    (set) => ({
      config: defaultMessageStyleConfig,
      
      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),
      
      resetConfig: () =>
        set({ config: defaultMessageStyleConfig }),
      
      setTypography: (typography) =>
        set((state) => ({
          config: {
            ...state.config,
            typography: { ...state.config.typography, ...typography },
          },
        })),
      
      setLayout: (layout) =>
        set((state) => ({
          config: {
            ...state.config,
            layout: { ...state.config.layout, ...layout },
          },
        })),
      
      setAvatar: (avatar) =>
        set((state) => ({
          config: {
            ...state.config,
            avatar: { ...state.config.avatar, ...avatar },
          },
        })),
      
      setActions: (actions) =>
        set((state) => ({
          config: {
            ...state.config,
            actions: { ...state.config.actions, ...actions },
          },
        })),
      
      setBranch: (branch) =>
        set((state) => ({
          config: {
            ...state.config,
            branch: { ...state.config.branch, ...branch },
          },
        })),
      
      setTimestamp: (timestamp) =>
        set((state) => ({
          config: {
            ...state.config,
            timestamp: { ...state.config.timestamp, ...timestamp },
          },
        })),
      
      setAnimation: (animation) =>
        set((state) => ({
          config: {
            ...state.config,
            animation: { ...state.config.animation, ...animation },
          },
        })),
      
      setEdit: (edit) =>
        set((state) => ({
          config: {
            ...state.config,
            edit: { ...state.config.edit, ...edit },
          },
        })),
      
      setSpeakerOverride: (speakerId, override) =>
        set((state) => ({
          config: {
            ...state.config,
            speakerOverrides: {
              ...state.config.speakerOverrides,
              [speakerId]: {
                ...state.config.speakerOverrides[speakerId],
                ...override,
              },
            },
          },
        })),
      
      clearSpeakerOverride: (speakerId) =>
        set((state) => {
          const { [speakerId]: _, ...rest } = state.config.speakerOverrides;
          return {
            config: {
              ...state.config,
              speakerOverrides: rest,
            },
          };
        }),
    }),
    {
      name: 'speedytavern-message-style',
    }
  )
);

// Selector hooks for performance - only re-render when specific section changes
export const useTypographyConfig = () => useMessageStyleStore((s) => s.config.typography);
export const useLayoutConfig = () => useMessageStyleStore((s) => s.config.layout);
export const useAvatarConfig = () => useMessageStyleStore((s) => s.config.avatar);
export const useActionsConfig = () => useMessageStyleStore((s) => s.config.actions);
export const useBranchConfig = () => useMessageStyleStore((s) => s.config.branch);
export const useTimestampConfig = () => useMessageStyleStore((s) => s.config.timestamp);
export const useAnimationConfig = () => useMessageStyleStore((s) => s.config.animation);
export const useEditConfig = () => useMessageStyleStore((s) => s.config.edit);
export const useFullConfig = () => useMessageStyleStore((s) => s.config);
