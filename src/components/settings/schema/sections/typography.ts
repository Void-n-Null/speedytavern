import { Type } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const typographySection: SectionDefinition = {
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
          description: 'Choose a custom font file you have uploaded',
          showWhen: { key: 'typography.fontFamily', value: 'custom' },
        },
      ],
    },
  ],
};

