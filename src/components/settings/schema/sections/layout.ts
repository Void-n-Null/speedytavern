import { LayoutGrid } from 'lucide-react';
import type { SectionDefinition } from '../types';
import { gapOptions, sizeOptions } from '../types';

export const layoutSection: SectionDefinition = {
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
          key: 'layout.viewMode',
          label: 'View Mode',
          description: 'Messages (normal chat) or Novel (no avatar/name/timestamps)',
          options: [
            { value: 'messages', label: 'Messages' },
            { value: 'novel', label: 'Novel' },
          ],
        },
        {
          type: 'select',
          key: 'layout.metaPosition',
          label: 'Meta Position',
          description: 'Where to show avatar and name',
          showWhen: { key: 'layout.viewMode', value: 'messages' },
          options: [
            { value: 'left', label: 'Left' },
            { value: 'above', label: 'Above' },
            { value: 'inline', label: 'Inline' },
            { value: 'aside', label: 'Aside' },
          ],
        },
        {
          type: 'switch',
          key: 'layout.showMessageDividers',
          label: 'Message Dividers',
          description: 'Show subtle dividers between messages (not at top/bottom)',
        },
        {
          type: 'select',
          key: 'layout.messageStyle',
          label: 'Message Style',
          description: 'Visual treatment of message containers',
          options: [
            { value: 'bubble', label: 'Bubble' },
            { value: 'flat', label: 'Flat' },
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
      title: 'Bubble',
      description: 'Bubble styling for the whole message container',
      showWhen: { key: 'layout.messageStyle', value: 'bubble' },
      controls: [
        {
          type: 'color',
          key: 'layout.bubbleBackgroundColor',
          label: 'Background Color',
          description: 'Bubble background color (supports rgba)',
        },
        {
          type: 'color',
          key: 'layout.bubbleBorderColor',
          label: 'Border Color',
          description: 'Bubble border color (supports rgba)',
        },
        {
          type: 'slider',
          key: 'layout.bubbleBorderWidthPx',
          label: 'Border Width',
          description: 'Bubble border thickness',
          min: 0,
          max: 6,
          step: 1,
          suffix: 'px',
        },
        {
          type: 'slider',
          key: 'layout.bubbleRadiusPx',
          label: 'Roundness',
          description: 'Bubble corner radius',
          min: 0,
          max: 32,
          step: 1,
          suffix: 'px',
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
      title: 'Dividers',
      description: 'Divider appearance and placement',
      showWhen: { key: 'layout.showMessageDividers', value: true },
      controls: [
        {
          type: 'select',
          key: 'layout.dividerMode',
          label: 'Divider Placement',
          description: 'Between every message, or only between groups (speaker changes when grouping is on)',
          options: [
            { value: 'messages', label: 'Between every message' },
            { value: 'groups', label: 'Between groups' },
          ],
        },
        {
          type: 'color',
          key: 'layout.dividerColor',
          label: 'Divider Color',
          description: 'Divider line color (hex)',
        },
        {
          type: 'slider',
          key: 'layout.dividerOpacity',
          label: 'Divider Opacity',
          description: 'Divider line opacity',
          min: 0,
          max: 100,
          step: 5,
          suffix: '%',
        },
        {
          type: 'slider',
          key: 'layout.dividerWidth',
          label: 'Divider Width',
          description: 'Divider line width as a percentage of the message area',
          min: 10,
          max: 100,
          step: 5,
          suffix: '%',
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
};

