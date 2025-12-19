import { type ModelCostBreakdown } from '../../../../api/ai';

interface ModelCostBarProps {
  data: ModelCostBreakdown;
  maxCost: number;
}

export function ModelCostBar({ data, maxCost }: ModelCostBarProps) {
  const percentage = maxCost > 0 ? (data.totalCostUsd / maxCost) * 100 : 0;
  const displayName = data.modelSlug.split('/').pop() || data.modelSlug;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300 truncate flex-1">{displayName}</span>
        <span className="text-zinc-500 shrink-0 ml-2">
          {data.requestCount} req · ${data.totalCostUsd.toFixed(4)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

