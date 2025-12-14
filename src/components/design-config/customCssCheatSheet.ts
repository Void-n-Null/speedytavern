export interface CustomCssCheatSheetItem {
  selector: string;
  description: string;
  example?: string;
}

export const customCssCheatSheet: CustomCssCheatSheetItem[] = [
  {
    selector: '.message-list-wrapper',
    description: 'Outer wrapper around the scroll container (also has data-dragging=true/false when resizing).',
    example: ".message-list-wrapper { max-width: 900px; margin: 0 auto; }",
  },
  {
    selector: '.message-list',
    description: 'Scrollable message list container.',
    example: '.message-list { scrollbar-gutter: stable; }',
  },
  {
    selector: '.message-list-content',
    description: 'Inner flex column that owns spacing/padding between messages.',
    example: '.message-list-content { padding: 12px 0; }',
  },
  {
    selector: '.message-item',
    description: 'A single message row container (has data-node-id and data-hovered). Many layout styles are applied inline.',
    example: ".message-item { outline: 1px solid rgba(255,255,255,0.06) !important; }",
  },
  {
    selector: '.message-meta',
    description: 'Avatar/name/timestamp container.',
    example: '.message-meta { opacity: 0.9; }',
  },
  {
    selector: '.message-avatar',
    description: 'Avatar element (image or fallback).',
    example: '.message-avatar { filter: saturate(1.2); }',
  },
  {
    selector: '.message-speaker-name',
    description: 'Speaker name text.',
    example: '.message-speaker-name { letter-spacing: 0.02em; }',
  },
  {
    selector: '.message-timestamp',
    description: 'Timestamp text.',
    example: '.message-timestamp { font-variant-numeric: tabular-nums; }',
  },
  {
    selector: '.message-body',
    description: 'Message body wrapper around content.',
    example: '.message-body { gap: 6px; }',
  },
  {
    selector: '.message-content',
    description: 'Rendered markdown content container (text styles like color/font are often inline).',
    example: '.message-content { color: #eaeaea !important; }',
  },
  {
    selector: '.message-content pre',
    description: 'Fenced code blocks.',
    example: '.message-content pre { border: 1px solid rgba(255,255,255,0.1); }',
  },
  {
    selector: '.message-action-btn',
    description: 'Per-message action buttons (edit/copy/etc).',
    example: '.message-action-btn { border-radius: 9999px; }',
  },
  {
    selector: '.branch-chevron',
    description: 'Branch navigation chevrons (left/right).',
    example: '.branch-chevron { opacity: 1 !important; }',
  },
  {
    selector: '.message-divider',
    description: 'Divider between messages when enabled.',
    example: '.message-divider { background: rgba(255,255,255,0.15) !important; }',
  },
];
