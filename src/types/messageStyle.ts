/**
 * Complete message styling configuration.
 * All options are designed to be serializable to localStorage.
 */

// ============ Typography ============
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed';
export type FontFamily = 'system' | 'mono' | 'serif';
export type FontWeight = 'normal' | 'medium' | 'bold';

export interface TypographyConfig {
  fontSize: FontSize;
  lineHeight: LineHeight;
  fontFamily: FontFamily;
  fontWeight: FontWeight;
  textColor: string;
  userTextColor: string;      // Override for user messages (empty = use textColor)
  botTextColor: string;       // Override for bot messages (empty = use textColor)
  timestampColor: string;
  usernameColor: string;
}

// ============ Layout ============
export type MetaPosition = 'left' | 'above' | 'inline';
export type Alignment = 'left' | 'right';
export type MessageStyle = 'bubble' | 'flat' | 'bordered';
export type Padding = 'compact' | 'normal' | 'spacious';
export type Gap = 'none' | 'tight' | 'normal' | 'spacious';

export interface LayoutConfig {
  metaPosition: MetaPosition;
  userAlignment: Alignment;
  botAlignment: Alignment;
  messageStyle: MessageStyle;
  bubblePadding: Padding;
  bubbleMaxWidth: number;       // Percentage (0-100)
  groupConsecutive: boolean;
  groupGap: Gap;
  messageGap: Gap;
  avatarGap: number;            // px
  containerWidth: number;       // Percentage (20-100), width of message list container
}

// ============ Avatar ============
export type AvatarShape = 'circle' | 'square' | 'rounded';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarVisibility = 'always' | 'first-in-group' | 'never';
export type AvatarVerticalAlign = 'top' | 'center' | 'bottom';
export type AvatarFallback = 'initials' | 'icon' | 'color-block';

export interface AvatarConfig {
  shape: AvatarShape;
  roundness: number;            // px border-radius when shape='rounded'
  size: AvatarSize;
  visibility: AvatarVisibility;
  verticalAlign: AvatarVerticalAlign;
  fallback: AvatarFallback;
}

// ============ Actions ============
export type Visibility = 'always' | 'hover';
export type ActionsPosition = 'inline' | 'bottom' | 'overlay-corner';
export type ActionsStyle = 'icon' | 'text' | 'icon-text';
export type ActionsSize = 'sm' | 'md' | 'lg';

export interface ActionsConfig {
  visibility: Visibility;
  position: ActionsPosition;
  style: ActionsStyle;
  size: ActionsSize;
  showEdit: boolean;
  showDelete: boolean;
  showBranch: boolean;
  showRegenerate: boolean;
  showCopy: boolean;
}

// ============ Branch Indicator ============
export type BranchVisibility = 'always' | 'hover' | 'when-multiple';
export type BranchPosition = 'top-right' | 'bottom' | 'inline-after-meta';
export type BranchStyle = 'arrows' | 'dots' | 'minimal';

export interface BranchConfig {
  visibility: BranchVisibility;
  position: BranchPosition;
  style: BranchStyle;
}

// ============ Timestamp ============
export type TimestampFormat = 'relative' | 'absolute' | 'smart' | 'hidden';
export type TimestampDetail = 'time-only' | 'date-only' | 'full';
export type TimestampPosition = 'with-name' | 'below-name' | 'message-end';

export interface TimestampConfig {
  format: TimestampFormat;
  detail: TimestampDetail;
  position: TimestampPosition;
}

// ============ Animation ============
export type Transition = 'none' | 'fade' | 'slide';
export type NewMessageAnimation = 'none' | 'fade-in' | 'slide-up';

export interface AnimationConfig {
  enabled: boolean;
  hoverTransition: Transition;
  newMessageAnimation: NewMessageAnimation;
}

// ============ Edit Mode ============
export type EditStyle = 'inline' | 'modal' | 'fullwidth';
export type EditButtonPosition = 'inline' | 'below';

export interface EditConfig {
  style: EditStyle;
  buttonPosition: EditButtonPosition;
}

// ============ Full Config ============
export interface MessageStyleConfig {
  typography: TypographyConfig;
  layout: LayoutConfig;
  avatar: AvatarConfig;
  actions: ActionsConfig;
  branch: BranchConfig;
  timestamp: TimestampConfig;
  animation: AnimationConfig;
  edit: EditConfig;
  speakerOverrides: Record<string, Partial<MessageStyleConfig>>;
}

// ============ Defaults ============
export const defaultTypography: TypographyConfig = {
  fontSize: 'md',
  lineHeight: 'normal',
  fontFamily: 'system',
  fontWeight: 'normal',
  textColor: '#e0e0e0',
  userTextColor: '',
  botTextColor: '',
  timestampColor: '#888888',
  usernameColor: '#ffffff',
};

export const defaultLayout: LayoutConfig = {
  metaPosition: 'left',
  userAlignment: 'right',
  botAlignment: 'left',
  messageStyle: 'bubble',
  bubblePadding: 'normal',
  bubbleMaxWidth: 80,
  groupConsecutive: true,
  groupGap: 'tight',
  messageGap: 'normal',
  avatarGap: 12,
  containerWidth: 50,
};

export const defaultAvatar: AvatarConfig = {
  shape: 'circle',
  roundness: 8,
  size: 'md',
  visibility: 'first-in-group',
  verticalAlign: 'top',
  fallback: 'initials',
};

export const defaultActions: ActionsConfig = {
  visibility: 'hover',
  position: 'inline',
  style: 'icon',
  size: 'md',
  showEdit: true,
  showDelete: true,
  showBranch: true,
  showRegenerate: true,
  showCopy: true,
};

export const defaultBranch: BranchConfig = {
  visibility: 'when-multiple',
  position: 'top-right',
  style: 'arrows',
};

export const defaultTimestamp: TimestampConfig = {
  format: 'smart',
  detail: 'time-only',
  position: 'with-name',
};

export const defaultAnimation: AnimationConfig = {
  enabled: true,
  hoverTransition: 'fade',
  newMessageAnimation: 'fade-in',
};

export const defaultEdit: EditConfig = {
  style: 'inline',
  buttonPosition: 'below',
};

export const defaultMessageStyleConfig: MessageStyleConfig = {
  typography: defaultTypography,
  layout: defaultLayout,
  avatar: defaultAvatar,
  actions: defaultActions,
  branch: defaultBranch,
  timestamp: defaultTimestamp,
  animation: defaultAnimation,
  edit: defaultEdit,
  speakerOverrides: {},
};

// ============ CSS Variable Mappings ============
export const fontSizeMap: Record<FontSize, string> = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

export const lineHeightMap: Record<LineHeight, string> = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
};

export const fontFamilyMap: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"Fira Code", "Consolas", monospace',
  serif: 'Georgia, "Times New Roman", serif',
};

export const fontWeightMap: Record<FontWeight, string> = {
  normal: '400',
  medium: '500',
  bold: '700',
};

export const avatarSizeMap: Record<AvatarSize, string> = {
  xs: '24px',
  sm: '32px',
  md: '40px',
  lg: '48px',
};

export const gapMap: Record<Gap, string> = {
  none: '0px',
  tight: '4px',
  normal: '8px',
  spacious: '16px',
};

export const paddingMap: Record<Padding, string> = {
  compact: '8px 12px',
  normal: '12px 16px',
  spacious: '16px 20px',
};

export const actionsSizeMap: Record<ActionsSize, string> = {
  sm: '20px',
  md: '28px',
  lg: '36px',
};
