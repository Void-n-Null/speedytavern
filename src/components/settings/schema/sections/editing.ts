import { Pencil } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const editingSection: SectionDefinition = {
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
};

