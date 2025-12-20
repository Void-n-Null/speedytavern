/**
 * ValidationBadge - Inline validation feedback with error display.
 */

import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

export interface ValidationMessage {
  level: ValidationLevel;
  message: string;
  field?: string;
}

interface ValidationBadgeProps {
  messages: ValidationMessage[];
  className?: string;
}

const levelConfig: Record<ValidationLevel, { icon: typeof AlertCircle; className: string }> = {
  error: { icon: AlertCircle, className: 'text-red-400 bg-red-500/10 border-red-500/30' },
  warning: { icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  info: { icon: Info, className: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  success: { icon: CheckCircle, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

export function ValidationBadge({ messages, className }: ValidationBadgeProps) {
  if (messages.length === 0) return null;
  
  // Show highest severity first
  const sortedMessages = [...messages].sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2, success: 3 };
    return order[a.level] - order[b.level];
  });
  
  const primaryMessage = sortedMessages[0];
  const { icon: Icon, className: levelClass } = levelConfig[primaryMessage.level];
  
  if (messages.length === 1) {
    return (
      <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', levelClass, className)}>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{primaryMessage.message}</span>
      </div>
    );
  }
  
  return (
    <div className={cn('rounded-lg border p-3', levelClass, className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{messages.length} issues found</span>
      </div>
      <ul className="mt-2 space-y-1 pl-6 text-xs">
        {sortedMessages.map((msg, i) => (
          <li key={i} className="list-disc">
            {msg.field && <span className="font-medium">{msg.field}: </span>}
            {msg.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ Validation helpers ============

export function validateCharacterCard(card: Record<string, unknown>): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  
  // Check for name
  const data = (card.data as Record<string, unknown>) || card;
  const name = data.name;
  if (!name || (typeof name === 'string' && !name.trim())) {
    messages.push({ level: 'error', message: 'Name is required', field: 'name' });
  }
  
  // Check for description
  const description = data.description;
  if (!description || (typeof description === 'string' && !description.trim())) {
    messages.push({ level: 'warning', message: 'Description is empty', field: 'description' });
  }
  
  // Check for first message
  const firstMes = data.first_mes;
  if (!firstMes || (typeof firstMes === 'string' && !firstMes.trim())) {
    messages.push({ level: 'warning', message: 'First message is empty', field: 'first_mes' });
  }
  
  // Check spec version
  const spec = card.spec;
  if (!spec) {
    messages.push({ level: 'info', message: 'No spec version set (will default to V1 format)' });
  }
  
  return messages;
}





