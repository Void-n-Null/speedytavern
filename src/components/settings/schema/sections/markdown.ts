import { Palette } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const markdownSection: SectionDefinition = {
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
};

