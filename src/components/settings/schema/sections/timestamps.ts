import { Clock } from 'lucide-react';
import type { SectionDefinition } from '../types';

export const timestampsSection: SectionDefinition = {
  id: 'timestamps',
  label: 'Timestamps',
  icon: Clock,
  description: 'Time display format',
  groups: [
    {
      controls: [
        {
          type: 'select',
          key: 'timestamp.format',
          label: 'Format',
          description: 'How time is displayed',
          options: [
            { value: 'smart', label: 'Smart' },
            { value: 'relative', label: 'Relative' },
            { value: 'absolute', label: 'Absolute' },
            { value: 'hidden', label: 'Hidden' },
          ],
        },
        {
          type: 'select',
          key: 'timestamp.detail',
          label: 'Detail',
          description: 'Amount of time info shown',
          options: [
            { value: 'time-only', label: 'Time Only' },
            { value: 'date-only', label: 'Date Only' },
            { value: 'full', label: 'Full' },
          ],
        },
        {
          type: 'select',
          key: 'timestamp.position',
          label: 'Position',
          description: 'Where timestamp appears',
          options: [
            { value: 'with-name', label: 'With Name' },
            { value: 'below-name', label: 'Below Name' },
            { value: 'message-end', label: 'End' },
          ],
        },
      ],
    },
  ],
};

