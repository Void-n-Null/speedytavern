import { cn } from '../../../../lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent: 'emerald' | 'violet' | 'blue' | 'amber';
}

export function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
}: StatCardProps) {
  const accentColors = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    violet: 'bg-violet-500/20 text-violet-400',
    blue: 'bg-blue-500/20 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3">
      <div className={cn('inline-flex rounded-lg p-2 mb-2', accentColors[accent])}>
        {icon}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={cn('text-lg font-bold text-zinc-100', loading && 'animate-pulse')}>
        {loading ? '...' : value}
      </div>
    </div>
  );
}


