import { cn } from '../../../../lib/utils';

interface CapabilityBadgeProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export function CapabilityBadge({ 
  icon, 
  label, 
  active = false 
}: CapabilityBadgeProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
      active 
        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800'
    )}>
      {icon}
      {label}
    </div>
  );
}

