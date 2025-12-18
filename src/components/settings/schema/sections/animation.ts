import { Sparkles } from 'lucide-react';
import type { SectionDefinition } from '../types';
import { transitionOptions } from '../types';

export const animationSection: SectionDefinition = {
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
};

