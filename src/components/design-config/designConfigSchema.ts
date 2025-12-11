/**
 * Interface Design Schema - Data-driven configuration for message styling
 * 
 * This schema defines the UI for customizing how messages are displayed.
 * All controls are generated from this schema - to reorganize, just move items.
 * Templates can override defaults defined here.
 */

import type { LucideIcon } from 'lucide-react';
import {
  User, Type, LayoutGrid, MousePointer2, Clock, Sparkles, Image, Pencil, Palette,
} from 'lucide-react';

// ============ Type Definitions ============

export type ControlType = 'select' | 'switch' | 'slider' | 'color' | 'text' | 'font-upload';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ControlDefinition {
  type: ControlType;
  key: string;           // Path in config, e.g., 'typography.fontSize'
  label: string;
  description?: string;
  // For select
  options?: SelectOption[];
  // For slider
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  // For conditional display
  showWhen?: { key: string; value: unknown };
}

export interface ControlGroup {
  title?: string;
  icon?: LucideIcon;
  description?: string;
  showWhen?: { key: string; value: unknown };
  controls: ControlDefinition[];
}

export interface SectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  groups: ControlGroup[];
}

// ============ Reusable Option Sets ============

const sizeOptions: SelectOption[] = [
  { value: 'xs', label: 'Extra Small' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

const gapOptions: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
];

const alignOptions: SelectOption[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const transitionOptions: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
];

// ============ Section Definitions ============

export const interfaceDesignSections: SectionDefinition[] = [
  {
    id: 'profile',
    label: 'Profiles',
    icon: User,
    description: 'Save and switch between style configurations',
    groups: [], // Profile tab is handled specially
  },
  {
    id: 'typography',
    label: 'Typography',
    icon: Type,
    description: 'Text appearance and readability',
    groups: [
      {
        title: 'Text Style',
        controls: [
          {
            type: 'select',
            key: 'typography.fontSize',
            label: 'Font Size',
            description: 'Base text size for messages',
            options: [
              { value: 'xs', label: 'Extra Small (12px)' },
              { value: 'sm', label: 'Small (14px)' },
              { value: 'md', label: 'Medium (16px)' },
              { value: 'lg', label: 'Large (18px)' },
              { value: 'xl', label: 'Extra Large (20px)' },
              { value: 'custom', label: 'Custom...' },
            ],
          },
          {
            type: 'slider',
            key: 'typography.customFontSizePx',
            label: 'Custom Size',
            description: 'Exact font size in pixels',
            min: 8,
            max: 48,
            step: 1,
            suffix: 'px',
            showWhen: { key: 'typography.fontSize', value: 'custom' },
          },
          {
            type: 'select',
            key: 'typography.lineHeight',
            label: 'Line Height',
            description: 'Vertical spacing between lines',
            options: [
              { value: 'tight', label: 'Tight' },
              { value: 'normal', label: 'Normal' },
              { value: 'relaxed', label: 'Relaxed' },
            ],
          },
          {
            type: 'select',
            key: 'typography.fontFamily',
            label: 'Font Family',
            description: 'Typeface used for message text',
            options: [
              { value: 'open-sans', label: 'Open Sans' },
              { value: 'red-hat-mono', label: 'Red Hat Mono' },
              { value: 'source-code-pro', label: 'Source Code Pro' },
              { value: 'poppins', label: 'Poppins' },
              { value: 'oswald', label: 'Oswald' },
              { value: 'custom', label: 'Custom Font' },
            ],
          },
          {
            type: 'select',
            key: 'typography.customFontId',
            label: 'Custom Font',
            description: 'Select an uploaded font',
            options: [], // Populated dynamically from server
            showWhen: { key: 'typography.fontFamily', value: 'custom' },
          },
          {
            type: 'font-upload',
            key: 'typography.fontUpload',
            label: 'Manage Fonts',
            description: 'Upload custom font files',
          },
          {
            type: 'select',
            key: 'typography.fontWeight',
            label: 'Font Weight',
            description: 'Text thickness/boldness',
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'medium', label: 'Medium' },
              { value: 'bold', label: 'Bold' },
            ],
          },
        ],
      },
      {
        title: 'Colors',
        icon: Palette,
        controls: [
          { type: 'color', key: 'typography.textColor', label: 'Text', description: 'Default message text color' },
          { type: 'color', key: 'typography.usernameColor', label: 'Username', description: 'Speaker name color' },
          { type: 'color', key: 'typography.userTextColor', label: 'User Messages', description: 'Override color for user text' },
          { type: 'color', key: 'typography.botTextColor', label: 'Bot Messages', description: 'Override color for bot text' },
          { type: 'color', key: 'typography.timestampColor', label: 'Timestamp', description: 'Time display color' },
        ],
      },
    ],
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: LayoutGrid,
    description: 'Message arrangement and spacing',
    groups: [
      {
        title: 'Message Layout',
        controls: [
          {
            type: 'select',
            key: 'layout.metaPosition',
            label: 'Meta Position',
            description: 'Where to show avatar and name',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'above', label: 'Above' },
              { value: 'inline', label: 'Inline' },
              { value: 'aside', label: 'Aside' },
            ],
          },
          {
            type: 'select',
            key: 'layout.userAlignment',
            label: 'User Alignment',
            description: 'Horizontal position of user messages',
            options: alignOptions,
          },
          {
            type: 'select',
            key: 'layout.botAlignment',
            label: 'Bot Alignment',
            description: 'Horizontal position of bot messages',
            options: alignOptions,
          },
          {
            type: 'select',
            key: 'layout.messageStyle',
            label: 'Message Style',
            description: 'Visual treatment of message containers',
            options: [
              { value: 'bubble', label: 'Bubble' },
              { value: 'flat', label: 'Flat' },
              { value: 'bordered', label: 'Bordered' },
            ],
          },
          {
            type: 'select',
            key: 'layout.bubblePadding',
            label: 'Padding',
            description: 'Inner spacing within messages',
            options: [
              { value: 'compact', label: 'Compact' },
              { value: 'normal', label: 'Normal' },
              { value: 'spacious', label: 'Spacious' },
              { value: 'extra', label: 'Extra' },
            ],
          },
        ],
      },
      {
        title: 'Sizing',
        controls: [
          {
            type: 'slider',
            key: 'layout.bubbleMaxWidth',
            label: 'Bubble Max Width',
            description: 'Maximum width of message bubbles',
            min: 30, max: 100, step: 5, suffix: '%',
          },
          {
            type: 'slider',
            key: 'layout.containerWidth',
            label: 'Container Width',
            description: 'Width of the message area',
            min: 20, max: 100, step: 5, suffix: '%',
          },
          {
            type: 'slider',
            key: 'layout.avatarGap',
            label: 'Avatar Gap',
            description: 'Space between avatar and message',
            min: 0, max: 32, step: 2, suffix: 'px',
          },
        ],
      },
      {
        title: 'Grouping',
        controls: [
          {
            type: 'switch',
            key: 'layout.groupConsecutive',
            label: 'Group Consecutive',
            description: 'Group messages from same sender',
          },
          {
            type: 'select',
            key: 'layout.groupGap',
            label: 'Group Gap',
            description: 'Space between message groups',
            options: gapOptions,
          },
          {
            type: 'select',
            key: 'layout.messageGap',
            label: 'Message Gap',
            description: 'Space between individual messages',
            options: gapOptions,
          },
        ],
      },
      {
        title: 'Branch Navigation',
        controls: [
          {
            type: 'select',
            key: 'branch.chevronSize',
            label: 'Chevron Size',
            description: 'Size of branch navigation arrows',
            options: sizeOptions.slice(1), // sm, md, lg only
          },
        ],
      },
    ],
  },
  {
    id: 'avatar',
    label: 'Avatar',
    icon: User,
    description: 'Avatar appearance and behavior',
    groups: [
      {
        controls: [
          {
            type: 'select',
            key: 'avatar.shape',
            label: 'Shape',
            description: 'Avatar border shape',
            options: [
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' },
              { value: 'rounded', label: 'Rounded' },
            ],
          },
          {
            type: 'slider',
            key: 'avatar.roundness',
            label: 'Roundness',
            description: 'Corner radius for rounded shape',
            min: 0, max: 24, step: 2, suffix: 'px',
            showWhen: { key: 'avatar.shape', value: 'rounded' },
          },
          {
            type: 'select',
            key: 'avatar.size',
            label: 'Size',
            description: 'Avatar dimensions',
            options: sizeOptions,
          },
          {
            type: 'select',
            key: 'avatar.visibility',
            label: 'Visibility',
            description: 'When to show avatars',
            options: [
              { value: 'always', label: 'Always' },
              { value: 'first-in-group', label: 'First in Group' },
              { value: 'never', label: 'Never' },
            ],
          },
          {
            type: 'select',
            key: 'avatar.verticalAlign',
            label: 'Vertical Align',
            description: 'Avatar position relative to message',
            options: [
              { value: 'top', label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'bottom', label: 'Bottom' },
            ],
          },
          {
            type: 'select',
            key: 'avatar.fallback',
            label: 'Fallback',
            description: 'When no image is available',
            options: [
              { value: 'initials', label: 'Initials' },
              { value: 'icon', label: 'Icon' },
              { value: 'color-block', label: 'Color' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: MousePointer2,
    description: 'Message action buttons',
    groups: [
      {
        title: 'Button Style',
        controls: [
          {
            type: 'select',
            key: 'actions.visibility',
            label: 'Visibility',
            description: 'When to show action buttons',
            options: [
              { value: 'always', label: 'Always' },
              { value: 'hover', label: 'On Hover' },
            ],
          },
          {
            type: 'select',
            key: 'actions.position',
            label: 'Position',
            description: 'Where buttons appear on messages',
            options: [
              { value: 'inline', label: 'Inline' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'overlay-corner', label: 'Overlay' },
            ],
          },
          {
            type: 'select',
            key: 'actions.style',
            label: 'Style',
            description: 'Button display format',
            options: [
              { value: 'icon', label: 'Icon' },
              { value: 'text', label: 'Text' },
              { value: 'icon-text', label: 'Both' },
            ],
          },
          {
            type: 'select',
            key: 'actions.size',
            label: 'Size',
            description: 'Button dimensions',
            options: sizeOptions.slice(1), // sm, md, lg
          },
        ],
      },
      {
        title: 'Visible Buttons',
        controls: [
          { type: 'switch', key: 'actions.showEdit', label: 'Edit', description: 'Modify message content' },
          { type: 'switch', key: 'actions.showDelete', label: 'Delete', description: 'Remove message from chat' },
          { type: 'switch', key: 'actions.showBranch', label: 'Branch', description: 'Create alternate response' },
          { type: 'switch', key: 'actions.showRegenerate', label: 'Regenerate', description: 'Request new response' },
          { type: 'switch', key: 'actions.showCopy', label: 'Copy', description: 'Copy text to clipboard' },
        ],
      },
    ],
  },
  {
    id: 'timestamps',
    label: 'Timestamps',
    icon: Clock,
    description: 'Time display format',
    groups: [
      {
        controls: [
          {
            type: 'select',
            key: 'timestamp.format',
            label: 'Format',
            description: 'How time is displayed',
            options: [
              { value: 'smart', label: 'Smart' },
              { value: 'relative', label: 'Relative' },
              { value: 'absolute', label: 'Absolute' },
              { value: 'hidden', label: 'Hidden' },
            ],
          },
          {
            type: 'select',
            key: 'timestamp.detail',
            label: 'Detail',
            description: 'Amount of time info shown',
            options: [
              { value: 'time-only', label: 'Time Only' },
              { value: 'date-only', label: 'Date Only' },
              { value: 'full', label: 'Full' },
            ],
          },
          {
            type: 'select',
            key: 'timestamp.position',
            label: 'Position',
            description: 'Where timestamp appears',
            options: [
              { value: 'with-name', label: 'With Name' },
              { value: 'below-name', label: 'Below Name' },
              { value: 'message-end', label: 'End' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'animation',
    label: 'Animation',
    icon: Sparkles,
    description: 'Motion and transitions',
    groups: [
      {
        controls: [
          {
            type: 'switch',
            key: 'animation.enabled',
            label: 'Enable Animations',
            description: 'Toggle all animations',
          },
        ],
      },
      {
        title: 'Transitions',
        controls: [
          {
            type: 'select',
            key: 'animation.hoverTransition',
            label: 'Hover Effect',
            description: 'Transition when hovering messages',
            options: transitionOptions,
          },
          {
            type: 'select',
            key: 'animation.newMessageAnimation',
            label: 'New Message',
            description: 'Animation for incoming messages',
            options: [
              { value: 'none', label: 'None' },
              { value: 'fade-in', label: 'Fade In' },
              { value: 'slide-up', label: 'Slide Up' },
            ],
          },
          {
            type: 'select',
            key: 'animation.branchSwitchAnimation',
            label: 'Branch Switch',
            description: 'Transition when switching branches',
            options: transitionOptions,
          },
        ],
      },
    ],
  },
  {
    id: 'editing',
    label: 'Editing',
    icon: Pencil,
    description: 'Message edit behavior',
    groups: [
      {
        controls: [
          {
            type: 'select',
            key: 'edit.style',
            label: 'Edit Style',
            description: 'How the edit interface appears',
            options: [
              { value: 'inline', label: 'Inline' },
              { value: 'modal', label: 'Modal' },
              { value: 'fullwidth', label: 'Full Width' },
            ],
          },
          {
            type: 'select',
            key: 'edit.buttonPosition',
            label: 'Button Position',
            description: 'Save/cancel button placement',
            options: [
              { value: 'inline', label: 'Inline' },
              { value: 'below', label: 'Below' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'markdown',
    label: 'Markdown',
    icon: Palette,
    description: 'Customize code blocks, quotes, and formatting',
    groups: [
      {
        title: 'Code Blocks',
        controls: [
          {
            type: 'color',
            key: 'markdown.codeBlockBackground',
            label: 'Background',
            description: 'Background color for fenced code blocks',
          },
          {
            type: 'color',
            key: 'markdown.codeBlockTextColor',
            label: 'Text Color',
            description: 'Text color in code blocks',
          },
          {
            type: 'slider',
            key: 'markdown.codeBlockBorderRadius',
            label: 'Border Radius',
            description: 'Roundness of code block corners',
            min: 0,
            max: 16,
            step: 1,
            suffix: 'px',
          },
        ],
      },
      {
        title: 'Inline Code',
        controls: [
          {
            type: 'color',
            key: 'markdown.inlineCodeBackground',
            label: 'Background',
            description: 'Background for `inline code`',
          },
          {
            type: 'color',
            key: 'markdown.inlineCodeTextColor',
            label: 'Text Color',
            description: 'Text color for inline code',
          },
        ],
      },
      {
        title: 'Blockquotes',
        controls: [
          {
            type: 'color',
            key: 'markdown.blockquoteBorderColor',
            label: 'Border Color',
            description: 'Left border color for quotes',
          },
          {
            type: 'color',
            key: 'markdown.blockquoteBackground',
            label: 'Background',
            description: 'Background color (use transparent for none)',
          },
          {
            type: 'color',
            key: 'markdown.blockquoteTextColor',
            label: 'Text Color',
            description: 'Text color in blockquotes',
          },
        ],
      },
      {
        title: 'Headings',
        controls: [
          {
            type: 'color',
            key: 'markdown.headingColor',
            label: 'Color',
            description: 'Heading color (empty = inherit from text)',
          },
          {
            type: 'select',
            key: 'markdown.headingWeight',
            label: 'Weight',
            description: 'Font weight for headings',
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'medium', label: 'Medium' },
              { value: 'bold', label: 'Bold' },
            ],
          },
          {
            type: 'select',
            key: 'markdown.headingSize',
            label: 'Size',
            description: 'Base size for headings',
            options: [
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra Large' },
            ],
          },
        ],
      },
      {
        title: 'Text Formatting',
        controls: [
          {
            type: 'color',
            key: 'markdown.boldColor',
            label: 'Bold Color',
            description: 'Color for **bold** text (empty = inherit)',
          },
          {
            type: 'color',
            key: 'markdown.italicColor',
            label: 'Italic Color',
            description: 'Color for *italic* text (empty = inherit)',
          },
          {
            type: 'switch',
            key: 'markdown.italicStyle',
            label: 'Apply Italic Style',
            description: 'Whether *text* renders in actual italics',
          },
          {
            type: 'color',
            key: 'markdown.quoteColor',
            label: 'Quote Color',
            description: 'Color for "quoted text" (empty = inherit)',
          },
        ],
      },
      {
        title: 'Links',
        controls: [
          {
            type: 'color',
            key: 'markdown.linkColor',
            label: 'Color',
            description: 'Link text color',
          },
          {
            type: 'switch',
            key: 'markdown.linkUnderline',
            label: 'Underline',
            description: 'Show underline on links',
          },
        ],
      },
    ],
  },
  {
    id: 'background',
    label: 'Background',
    icon: Image,
    description: 'Page background customization',
    groups: [
      {
        controls: [
          {
            type: 'select',
            key: 'pageBackground.type',
            label: 'Type',
            description: 'Background style for chat area',
            options: [
              { value: 'color', label: 'Solid Color' },
              { value: 'image', label: 'Image' },
              { value: 'none', label: 'None' },
            ],
          },
          {
            type: 'color',
            key: 'pageBackground.color',
            label: 'Color',
            description: 'Solid background color',
            showWhen: { key: 'pageBackground.type', value: 'color' },
          },
        ],
      },
      {
        title: 'Image Settings',
        showWhen: { key: 'pageBackground.type', value: 'image' },
        controls: [
          {
            type: 'text',
            key: 'pageBackground.imageUrl',
            label: 'Image URL',
            description: 'URL to background image',
          },
          {
            type: 'select',
            key: 'pageBackground.size',
            label: 'Size',
            description: 'How image fills the area',
            options: [
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'auto', label: 'Auto' },
            ],
          },
          {
            type: 'select',
            key: 'pageBackground.position',
            label: 'Position',
            description: 'Image alignment',
            options: [
              { value: 'center', label: 'Center' },
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
            ],
          },
          {
            type: 'select',
            key: 'pageBackground.repeat',
            label: 'Repeat',
            description: 'Tile image if smaller than area',
            options: [
              { value: 'no-repeat', label: 'None' },
              { value: 'repeat', label: 'Repeat' },
            ],
          },
          {
            type: 'slider',
            key: 'pageBackground.opacity',
            label: 'Overlay Opacity',
            description: 'Lower = darker overlay',
            min: 0, max: 100, step: 5, suffix: '%',
          },
        ],
      },
      {
        title: 'Message List Background',
        description: 'Distinct background for the message list area',
        controls: [
          {
            type: 'switch',
            key: 'messageListBackground.enabled',
            label: 'Enable',
            description: 'Show a separate background for the message list',
          },
          {
            type: 'select',
            key: 'messageListBackground.type',
            label: 'Type',
            description: 'Background style for message list',
            showWhen: { key: 'messageListBackground.enabled', value: true },
            options: [
              { value: 'color', label: 'Solid Color' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'none', label: 'None' },
            ],
          },
          {
            type: 'color',
            key: 'messageListBackground.color',
            label: 'Color',
            description: 'Solid background color (supports rgba for transparency)',
            showWhen: { key: 'messageListBackground.type', value: 'color' },
          },
          {
            type: 'color',
            key: 'messageListBackground.gradientFrom',
            label: 'Gradient Start',
            description: 'Starting color of gradient',
            showWhen: { key: 'messageListBackground.type', value: 'gradient' },
          },
          {
            type: 'color',
            key: 'messageListBackground.gradientTo',
            label: 'Gradient End',
            description: 'Ending color of gradient',
            showWhen: { key: 'messageListBackground.type', value: 'gradient' },
          },
          {
            type: 'select',
            key: 'messageListBackground.gradientDirection',
            label: 'Gradient Direction',
            description: 'Direction of gradient flow',
            showWhen: { key: 'messageListBackground.type', value: 'gradient' },
            options: [
              { value: 'to-bottom', label: 'Top to Bottom' },
              { value: 'to-top', label: 'Bottom to Top' },
              { value: 'to-right', label: 'Left to Right' },
              { value: 'to-left', label: 'Right to Left' },
              { value: 'to-bottom-right', label: 'Diagonal ↘' },
              { value: 'to-bottom-left', label: 'Diagonal ↙' },
            ],
          },
          {
            type: 'slider',
            key: 'messageListBackground.opacity',
            label: 'Opacity',
            description: 'Overall background opacity',
            showWhen: { key: 'messageListBackground.enabled', value: true },
            min: 0, max: 100, step: 5, suffix: '%',
          },
          {
            type: 'slider',
            key: 'messageListBackground.blur',
            label: 'Blur (Frosted Glass)',
            description: 'Backdrop blur effect',
            showWhen: { key: 'messageListBackground.enabled', value: true },
            min: 0, max: 20, step: 1, suffix: 'px',
          },
        ],
      },
    ],
  },
];

// Helper to get a value from a nested object by dot path
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

// Helper to set a value in a nested object by dot path
export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    current[part] = { ...(current[part] as Record<string, unknown> || {}) };
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
  return result;
}
