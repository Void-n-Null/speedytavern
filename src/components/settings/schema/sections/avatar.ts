import { User } from 'lucide-react';
import type { SectionDefinition } from '../types';
import { sizeOptions } from '../types';

export const avatarSection: SectionDefinition = {
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
};

