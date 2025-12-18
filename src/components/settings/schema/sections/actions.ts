import { MousePointer2 } from 'lucide-react';
import type { SectionDefinition } from '../types';
import { sizeOptions } from '../types';

export const actionsSection: SectionDefinition = {
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
};

