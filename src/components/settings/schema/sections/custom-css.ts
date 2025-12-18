import { Palette } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const customCssSection: SectionDefinition = {
  id: 'custom-css',
  label: 'Custom CSS',
  icon: Palette,
  description: 'Inject your own CSS rules (recommended for power users or advanced design alterations)',
  groups: [
    {
      title: 'Overrides',
      controls: [
        {
          type: 'switch',
          key: 'customCss.enabled',
          label: 'Enable Custom CSS',
          description: 'When enabled, your CSS is injected into the page and can override built-in styles',
        },
        {
          type: 'text',
          key: 'customCss.css',
          label: 'CSS',
          description: 'Paste CSS rules here. Note: inline styles may require !important to override.',
          showWhen: { key: 'customCss.enabled', value: true },
        },
      ],
    },
  ],
};

