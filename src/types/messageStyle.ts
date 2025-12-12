/**
 * Complete message styling configuration.
 * All options are designed to be serializable to localStorage.
 */

import defaultTemplate from '../config/defaultTemplate.json';

// ============ Typography ============
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
export type LineHeight = 'tight' | 'normal' | 'relaxed';
export type FontFamily = 'open-sans' | 'red-hat-mono' | 'source-code-pro' | 'poppins' | 'oswald' | 'custom';
export type FontWeight = 'normal' | 'medium' | 'bold';

export interface TypographyConfig {
  fontSize: FontSize;
  customFontSizePx: number;   // Custom font size in px (when fontSize = 'custom')
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
export type MetaPosition = 'left' | 'above' | 'inline' | 'aside';
export type Alignment = 'left' | 'right';
export type MessageStyle = 'bubble' | 'flat' | 'bordered';
export type Padding = 'compact' | 'normal' | 'spacious' | 'extra';
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

// ============ Header (App Toolbar) ============
export type HeaderWidthMode = 'match-chat' | 'full';
export type HeaderSettingsButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
export type HeaderDisplayMode = 'normal' | 'hover-reveal';

export interface HeaderConfig {
  displayMode: HeaderDisplayMode;
  hoverTabText: string;
  hoverRevealZoneHeightPx: number;
  hoverTabFontSizePx: number;

  widthMode: HeaderWidthMode;
  heightPx: number;
  paddingX: number;
  backgroundColor: string;       // Supports hex/rgb(a)
  backgroundOpacity: number;     // 0-100
  backdropBlurPx: number;        // 0-20

  borderBottom: boolean;
  borderColor: string;           // Supports hex/rgb(a)
  borderOpacity: number;         // 0-100
  borderWidthPx: number;

  roundedBottom: boolean;
  radiusPx: number;

  showLogo: boolean;
  logoUrl: string;
  logoHeightPx: number;
  logoMaxWidthPx: number;

  showTitle: boolean;
  titleText: string;
  titleColor: string;
  titleSizePx: number;

  settingsButtonVariant: HeaderSettingsButtonVariant;
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

// ============ Markdown Styling ============
export type HeadingSize = 'sm' | 'md' | 'lg' | 'xl';

export interface MarkdownStyleConfig {
  // Code blocks
  codeBlockBackground: string;
  codeBlockTextColor: string;
  codeBlockBorderRadius: number;    // px
  // Inline code
  inlineCodeBackground: string;
  inlineCodeTextColor: string;
  // Blockquotes
  blockquoteBorderColor: string;
  blockquoteBackground: string;
  blockquoteTextColor: string;
  // Headings
  headingColor: string;             // Shared color for all headings (empty = inherit)
  headingWeight: FontWeight;
  headingSize: HeadingSize;         // Base size multiplier for headings
  // Text formatting
  boldColor: string;                // Color for **bold** text (empty = inherit)
  italicColor: string;              // Color for *italic* text (empty = inherit)
  italicStyle: boolean;             // Whether italics apply actual italic styling
  quoteColor: string;               // Color for "quoted text" (empty = inherit)
  // Links
  linkColor: string;
  linkUnderline: boolean;
}

// ============ Full Config ============
export interface MessageStyleConfig {
  typography: TypographyConfig;
  layout: LayoutConfig;
  header: HeaderConfig;
  avatar: AvatarConfig;
  actions: ActionsConfig;
  branch: BranchConfig;
  timestamp: TimestampConfig;
  animation: AnimationConfig;
  edit: EditConfig;
  markdown: MarkdownStyleConfig;
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
export const defaultHeader = defaultMessageStyleConfig.header;
export const defaultAvatar = defaultMessageStyleConfig.avatar;
export const defaultActions = defaultMessageStyleConfig.actions;
export const defaultBranch = defaultMessageStyleConfig.branch;
export const defaultTimestamp = defaultMessageStyleConfig.timestamp;
export const defaultAnimation = defaultMessageStyleConfig.animation;
export const defaultEdit = defaultMessageStyleConfig.edit;
export const defaultMarkdown = defaultMessageStyleConfig.markdown;
export const defaultPageBackground = defaultMessageStyleConfig.pageBackground;
export const defaultMessageListBackground = defaultMessageStyleConfig.messageListBackground;

/**
 * Best-effort defaults merger for backwards compatibility with older stored profiles.
 * This is a shallow merge per top-level section.
 */
export function applyMessageStyleDefaults(partial: Partial<MessageStyleConfig> | null | undefined): MessageStyleConfig {
  const p = partial ?? {};
  return {
    ...defaultMessageStyleConfig,
    ...p,
    typography: { ...defaultMessageStyleConfig.typography, ...(p as any).typography },
    layout: { ...defaultMessageStyleConfig.layout, ...(p as any).layout },
    header: { ...defaultMessageStyleConfig.header, ...(p as any).header },
    avatar: { ...defaultMessageStyleConfig.avatar, ...(p as any).avatar },
    actions: { ...defaultMessageStyleConfig.actions, ...(p as any).actions },
    branch: { ...defaultMessageStyleConfig.branch, ...(p as any).branch },
    timestamp: { ...defaultMessageStyleConfig.timestamp, ...(p as any).timestamp },
    animation: { ...defaultMessageStyleConfig.animation, ...(p as any).animation },
    edit: { ...defaultMessageStyleConfig.edit, ...(p as any).edit },
    markdown: { ...defaultMessageStyleConfig.markdown, ...(p as any).markdown },
    pageBackground: { ...defaultMessageStyleConfig.pageBackground, ...(p as any).pageBackground },
    messageListBackground: { ...defaultMessageStyleConfig.messageListBackground, ...(p as any).messageListBackground },
    speakerOverrides: (p as any).speakerOverrides ?? defaultMessageStyleConfig.speakerOverrides,
  };
}

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
  custom: 'inherit', // Use customFontSizePx instead when fontSize === 'custom'
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
  compact: '0px 2px',
  normal: '4px 12px',
  spacious: '10px 16px',
  extra: '14px 24px', 
};

export const actionsSizeMap: Record<ActionsSize, string> = {
  sm: '20px',
  md: '28px',
  lg: '36px',
};
