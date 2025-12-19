import { type DailyCostTrend } from '../../../../api/ai';
import { cn } from '../../../../lib/utils';

interface TrendChartProps {
  data: DailyCostTrend[];
  isMobile: boolean;
}

export function TrendChart({ data, isMobile }: TrendChartProps) {
  const maxCost = Math.max(...data.map(d => d.totalCostUsd), 0.0001);

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((d, i) => {
        const height = maxCost > 0 ? (d.totalCostUsd / maxCost) * 100 : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div
              className="w-full bg-gradient-to-t from-violet-500/50 to-violet-400 rounded-t transition-all group-hover:from-violet-500 group-hover:to-violet-300"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {!isMobile && data.length <= 14 && (
              <span className="text-[9px] text-zinc-600 truncate">
                {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            )}
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-lg whitespace-nowrap">
                {d.date}: ${d.totalCostUsd.toFixed(4)} ({d.requestCount} req)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

