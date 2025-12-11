/**
 * GroupRenderer - Renders a collapsible group of controls
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ControlRenderer } from './controls';
import { getValueByPath, type ControlGroup } from './designConfigSchema';
import { useDesignConfigModalState } from '../../store/designConfigModalState';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4', className)}>
      {children}
    </div>
  );
}

interface GroupRendererProps {
  group: ControlGroup;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  compact?: boolean;
  groupIndex: number;
  sectionId: string;
  isMobile?: boolean;
}

export function GroupRenderer({ 
  group, 
  config, 
  onChange, 
  compact, 
  groupIndex, 
  sectionId,
  isMobile,
}: GroupRendererProps) {
  const groupKey = `${sectionId}-${groupIndex}`;
  // Use selectors to avoid re-renders when unrelated groups collapse/expand
  const isCollapsed = useDesignConfigModalState(s => s.collapsedGroups.has(groupKey));
  const toggleGroupCollapsed = useDesignConfigModalState(s => s.toggleGroupCollapsed);
  
  if (group.showWhen) {
    const conditionValue = getValueByPath(config, group.showWhen.key);
    if (conditionValue !== group.showWhen.value) return null;
  }

  const visibleControls = group.controls.filter((ctrl) => {
    if (!ctrl.showWhen) return true;
    return getValueByPath(config, ctrl.showWhen.key) === ctrl.showWhen.value;
  });

  if (visibleControls.length === 0) return null;

  return (
    <Card className={compact ? 'p-3' : undefined}>
      {group.title && (
        <button
          onClick={() => toggleGroupCollapsed(groupKey)}
          className="w-full flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/50 hover:bg-zinc-800/20 -mx-1 px-1 rounded transition-colors"
        >
          <ChevronDown className={cn(
            "w-4 h-4 text-zinc-500 transition-transform",
            isCollapsed && "-rotate-90"
          )} />
          {group.icon && <group.icon className="w-4 h-4 text-zinc-500" />}
          <span className="text-sm font-medium text-zinc-300">{group.title}</span>
        </button>
      )}
      {!isCollapsed && (
        <div className={cn("divide-y divide-zinc-800/30", compact && "space-y-1 divide-y-0")}>
          {visibleControls.map((ctrl) => (
            <ControlRenderer 
              key={ctrl.key} 
              control={ctrl} 
              config={config} 
              onChange={onChange}
              compact={compact}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
