import { cn } from '../../../../lib/utils';

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

export function FilterPill({
  active,
  onClick,
  label,
  icon,
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
          : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

