import { Image } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const backgroundSection: SectionDefinition = {
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
};

