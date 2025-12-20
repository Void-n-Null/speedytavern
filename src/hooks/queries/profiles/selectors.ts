import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { profiles } from '../../../api/profiles';
import type {
  MessageStyleConfig,
  TypographyConfig,
  LayoutConfig,
  HeaderConfig,
  AvatarConfig,
  ActionsConfig,
  BranchConfig,
  TimestampConfig,
  AnimationConfig,
  EditConfig,
  MarkdownStyleConfig,
  CustomCssConfig,
  PageBackgroundConfig,
  MessageListBackgroundConfig,
  ComposerConfig,
} from '../../../types/messageStyle';
import {
  defaultTypography,
  defaultLayout,
  defaultHeader,
  defaultAvatar,
  defaultActions,
  defaultBranch,
  defaultTimestamp,
  defaultAnimation,
  defaultEdit,
  defaultMarkdown,
  defaultCustomCss,
  defaultPageBackground,
  defaultMessageListBackground,
  defaultComposer,
  defaultMessageStyleConfig,
  applyMessageStyleDefaults,
} from '../../../types/messageStyle';

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
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).layout,
  });
  return data ?? defaultLayout;
}

/** Header (App Toolbar) config with defaults */
export function useHeaderConfig(): HeaderConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).header,
  });
  return data ?? defaultHeader;
}

/** Avatar config with defaults */
export function useAvatarConfig(): AvatarConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).avatar,
  });
  return data ?? defaultAvatar;
}

/** Actions config with defaults */
export function useActionsConfig(): ActionsConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).actions,
  });
  return data ?? defaultActions;
}

/** Branch indicator config with defaults */
export function useBranchConfig(): BranchConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).branch,
  });
  return data ?? defaultBranch;
}

/** Timestamp config with defaults */
export function useTimestampConfig(): TimestampConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).timestamp,
  });
  return data ?? defaultTimestamp;
}

/** Animation config with defaults */
export function useAnimationConfig(): AnimationConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).animation,
  });
  return data ?? defaultAnimation;
}

/** Edit config with defaults */
export function useEditConfig(): EditConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).edit,
  });
  return data ?? defaultEdit;
}

/** Markdown styling config with defaults */
export function useMarkdownConfig(): MarkdownStyleConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).markdown,
  });
  return data ?? defaultMarkdown;
}

/** Custom CSS config with defaults */
export function useCustomCssConfig(): CustomCssConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).customCss,
  });
  return data ?? defaultCustomCss;
}

/** Page background config with defaults */
export function usePageBackgroundConfig(): PageBackgroundConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).pageBackground,
  });
  return data ?? defaultPageBackground;
}

/** Message list background config with defaults */
export function useMessageListBackgroundConfig(): MessageListBackgroundConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).messageListBackground,
  });
  return data ?? defaultMessageListBackground;
}

/** Composer (chat input) config with defaults */
export function useComposerConfig(): ComposerConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle).composer,
  });
  return data ?? defaultComposer;
}

/** Full message style config with defaults */
export function useFullConfig(): MessageStyleConfig {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => applyMessageStyleDefaults(profile?.messageStyle),
  });
  return data ?? defaultMessageStyleConfig;
}

/** Profile name (User Name) */
export function useProfileName(): string {
  const { data } = useQuery({
    queryKey: queryKeys.profiles.active(),
    queryFn: () => profiles.getActive(),
    select: (profile) => profile?.name ?? 'User',
  });
  return data ?? 'User';
}
