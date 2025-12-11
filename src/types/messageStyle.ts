/**
 * Complete message styling configuration.
 * All options are designed to be serializable to localStorage.
 */

import defaultTemplate from '../config/defaultTemplate.json';

// ============ Typography ============
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed';
export type FontFamily = 'open-sans' | 'red-hat-mono' | 'source-code-pro' | 'poppins' | 'oswald' | 'custom';
export type FontWeight = 'normal' | 'medium' | 'bold';

export interface TypographyConfig {
  fontSize: FontSize;
  lineHeight: LineHeight;
  fontFamily: FontFamily;
  fontWeight: FontWeight;
  customFontId?: string;      // ID of uploaded custom font (when fontFamily = 'custom')
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
export type BranchChevronSize = 'sm' | 'md' | 'lg';

export interface BranchConfig {
  chevronSize: BranchChevronSize;
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
export type BranchSwitchAnimation = 'none' | 'slide' | 'fade';

export interface AnimationConfig {
  enabled: boolean;
  hoverTransition: Transition;
  newMessageAnimation: NewMessageAnimation;
  branchSwitchAnimation: BranchSwitchAnimation;
}

// ============ Edit Mode ============
export type EditStyle = 'inline' | 'modal' | 'fullwidth';
export type EditButtonPosition = 'inline' | 'below';

export interface EditConfig {
  style: EditStyle;
  buttonPosition: EditButtonPosition;
}

// ============ Message List Background ============
export type MessageListBackgroundType = 'none' | 'color' | 'gradient';
export type GradientDirection = 'to-bottom' | 'to-top' | 'to-right' | 'to-left' | 'to-bottom-right' | 'to-bottom-left';

export interface MessageListBackgroundConfig {
  enabled: boolean;
  type: MessageListBackgroundType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: GradientDirection;
  opacity: number;              // 0-100
  blur: number;                 // 0-20 px blur for frosted glass effect
}

// ============ Page Background ============
export type BackgroundType = 'color' | 'image' | 'none';
export type BackgroundSize = 'cover' | 'contain' | 'auto';
export type BackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type BackgroundRepeat = 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';

export interface PageBackgroundConfig {
  type: BackgroundType;
  color: string;
  imageUrl: string;
  size: BackgroundSize;
  position: BackgroundPosition;
  repeat: BackgroundRepeat;
  opacity: number;              // 0-100, for image overlay
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
  pageBackground: PageBackgroundConfig;
  messageListBackground: MessageListBackgroundConfig;
  speakerOverrides: Record<string, Partial<MessageStyleConfig>>;
}

// ============ Defaults (loaded from JSON template) ============

// Single source of truth - edit defaultTemplate.json to change defaults
export const defaultMessageStyleConfig = defaultTemplate as MessageStyleConfig;

// Section-level defaults for hooks that need them
export const defaultTypography = defaultMessageStyleConfig.typography;
export const defaultLayout = defaultMessageStyleConfig.layout;
export const defaultAvatar = defaultMessageStyleConfig.avatar;
export const defaultActions = defaultMessageStyleConfig.actions;
export const defaultBranch = defaultMessageStyleConfig.branch;
export const defaultTimestamp = defaultMessageStyleConfig.timestamp;
export const defaultAnimation = defaultMessageStyleConfig.animation;
export const defaultEdit = defaultMessageStyleConfig.edit;
export const defaultPageBackground = defaultMessageStyleConfig.pageBackground;
export const defaultMessageListBackground = defaultMessageStyleConfig.messageListBackground;

// ============ CSS Variable Mappings ============
export const branchChevronSizeMap: Record<BranchChevronSize, { width: number; height: number; fontSize: number }> = {
  sm: { width: 16, height: 24, fontSize: 12 },
  md: { width: 28, height: 44, fontSize: 20 },
  lg: { width: 40, height: 64, fontSize: 28 },
};

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
  'open-sans': '"Open Sans", sans-serif',
  'red-hat-mono': '"Red Hat Mono", monospace',
  'source-code-pro': '"Source Code Pro", monospace',
  'poppins': '"Poppins", sans-serif',
  'oswald': '"Oswald", sans-serif',
  'custom': 'var(--custom-font-family, sans-serif)',
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
