/**
 * Costs Tab
 * 
 * Cost analytics with overview cards, interactive calculator, and charts.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, Cpu, Clock, Calculator, ChevronDown, ChevronUp,
  AlertCircle, BarChart3
} from 'lucide-react';
import { aiRequestLogs, openRouterModels, type CostSummary, type ModelCostBreakdown, type DailyCostTrend } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface CostsTabProps {
  isMobile: boolean;
  activeProviderId?: string | null;
}

// Time range options
type TimeRange = 'today' | 'week' | 'month' | 'all';

export function CostsTab({ isMobile, activeProviderId }: CostsTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [calculatorExpanded, setCalculatorExpanded] = useState(false);

  // Calculate date range
  const filters = useMemo(() => {
    const now = Date.now();
    let startDate: number | undefined;
    switch (timeRange) {
      case 'today':
        startDate = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }
    return { startDate, endDate: now, providerId: activeProviderId || undefined };
  }, [timeRange, activeProviderId]);

  // Fetch cost data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.summary(filters),
    queryFn: () => aiRequestLogs.getSummary(filters),
  });

  const { data: byModel, isLoading: byModelLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.byModel(filters),
    queryFn: () => aiRequestLogs.getByModel({ ...filters, limit: 10 }),
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: queryKeys.aiRequestLogs.trend({ 
      days: timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30,
      providerId: activeProviderId || undefined 
    }),
    queryFn: () => aiRequestLogs.getTrend({ 
      days: timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30,
      providerId: activeProviderId || undefined 
    }),
  });

  return (
    <div className={cn('h-full overflow-auto', isMobile ? 'p-3' : 'p-4')}>
      <div className="space-y-4">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Cost Analytics</h3>
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'all'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  timeRange === r
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className={cn('grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-4')}>
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Total Spend"
            value={summary ? `$${summary.totalCostUsd.toFixed(4)}` : '-'}
            loading={summaryLoading}
            accent="emerald"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg per Request"
            value={summary ? `$${summary.avgCostPerRequest.toFixed(6)}` : '-'}
            loading={summaryLoading}
            accent="violet"
          />
          <StatCard
            icon={<Cpu className="h-4 w-4" />}
            label="Total Requests"
            value={summary ? summary.totalRequests.toLocaleString() : '-'}
            loading={summaryLoading}
            accent="blue"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Avg Latency"
            value={summary ? `${Math.round(summary.avgLatencyMs)}ms` : '-'}
            loading={summaryLoading}
            accent="amber"
          />
        </div>

        {/* Interactive Cost Calculator */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30">
          <button
            onClick={() => setCalculatorExpanded(!calculatorExpanded)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-semibold text-zinc-200">Cost Calculator</span>
              <span className="text-xs text-zinc-500">Estimate costs for any model</span>
            </div>
            {calculatorExpanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          {calculatorExpanded && (
            <div className="border-t border-zinc-800/50 p-4">
              <CostCalculator isMobile={isMobile} />
            </div>
          )}
        </div>

        {/* Cost by Model */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">Cost by Model</span>
          </div>

          {byModelLoading ? (
            <div className="text-sm text-zinc-500 py-4 text-center">Loading...</div>
          ) : !byModel || byModel.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4 text-center">
              No usage data yet. Start chatting to see your cost breakdown.
            </div>
          ) : (
            <div className="space-y-2">
              {byModel.map(m => (
                <ModelCostBar key={m.modelSlug} data={m} maxCost={byModel[0]?.totalCostUsd || 1} />
              ))}
            </div>
          )}
        </div>

        {/* Daily Trend */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">Daily Trend</span>
          </div>

          {trendLoading ? (
            <div className="text-sm text-zinc-500 py-4 text-center">Loading...</div>
          ) : !trend || trend.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4 text-center">
              No trend data yet.
            </div>
          ) : (
            <TrendChart data={trend} isMobile={isMobile} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Stat Card ============

function StatCard({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  accent: 'emerald' | 'violet' | 'blue' | 'amber';
}) {
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

// ============ Cost Calculator ============

function CostCalculator({ isMobile }: { isMobile: boolean }) {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [inputTokens, setInputTokens] = useState(1000);
  const [outputTokens, setOutputTokens] = useState(500);

  const { data: models } = useQuery({
    queryKey: queryKeys.openRouterModels.list(),
    queryFn: () => openRouterModels.list().then(r => r.models),
  });

  const selectedModel = models?.find(m => m.id === selectedModelId);

  const calculateCost = useMemo(() => {
    if (!selectedModel || !selectedModel.pricing) return null;
    
    const inputCost = (inputTokens / 1_000_000) * (selectedModel.pricing.prompt ?? 0) * 1_000_000;
    const outputCost = (outputTokens / 1_000_000) * (selectedModel.pricing.completion ?? 0) * 1_000_000;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
    };
  }, [selectedModel, inputTokens, outputTokens]);

  // Token cost estimates at various levels
  const costLevels = useMemo(() => {
    if (!selectedModel || !selectedModel.pricing) return [];
    
    const levels = [
      { label: 'Light chat', input: 500, output: 200 },
      { label: 'Normal chat', input: 2000, output: 500 },
      { label: 'Heavy chat', input: 8000, output: 2000 },
      { label: 'Long context', input: 32000, output: 4000 },
      { label: 'Max context', input: 100000, output: 8000 },
    ];

    return levels.map(l => {
      const inCost = (l.input / 1_000_000) * (selectedModel.pricing?.prompt ?? 0) * 1_000_000;
      const outCost = (l.output / 1_000_000) * (selectedModel.pricing?.completion ?? 0) * 1_000_000;
      return {
        ...l,
        cost: inCost + outCost,
      };
    });
  }, [selectedModel]);

  return (
    <div className="space-y-4">
      {/* Model selector */}
      <div>
        <Label className="text-xs text-zinc-400 mb-1.5 block">Select Model</Label>
        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
          <SelectTrigger className="bg-zinc-900/50 border-zinc-800/60">
            <SelectValue placeholder="Choose a model..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 max-h-64">
            {models?.slice(0, 50).map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.shortName || m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModel && (
        <>
          {/* Token inputs */}
          <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">
                Input Tokens <span className="text-zinc-600">(${((selectedModel.pricing?.prompt ?? 0) * 1_000_000).toFixed(2)}/M)</span>
              </Label>
              <Input
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(parseInt(e.target.value) || 0)}
                className="bg-zinc-900/50 border-zinc-800/60"
              />
              <input
                type="range"
                min={0}
                max={100000}
                step={100}
                value={inputTokens}
                onChange={(e) => setInputTokens(parseInt(e.target.value))}
                className="w-full mt-2 accent-violet-500"
              />
            </div>
            <div>
              <Label className="text-xs text-zinc-400 mb-1.5 block">
                Output Tokens <span className="text-zinc-600">(${((selectedModel.pricing?.completion ?? 0) * 1_000_000).toFixed(2)}/M)</span>
              </Label>
              <Input
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(parseInt(e.target.value) || 0)}
                className="bg-zinc-900/50 border-zinc-800/60"
              />
              <input
                type="range"
                min={0}
                max={50000}
                step={100}
                value={outputTokens}
                onChange={(e) => setOutputTokens(parseInt(e.target.value))}
                className="w-full mt-2 accent-violet-500"
              />
            </div>
          </div>

          {/* Cost result */}
          {calculateCost && (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-4">
              <div className="text-xs text-zinc-400 mb-2">Estimated Cost per Request</div>
              <div className="text-2xl font-bold text-violet-300">
                ${calculateCost.totalCost.toFixed(6)}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                <span>Input: ${calculateCost.inputCost.toFixed(6)}</span>
                <span>Output: ${calculateCost.outputCost.toFixed(6)}</span>
              </div>
            </div>
          )}

          {/* Cost at different usage levels */}
          <div>
            <Label className="text-xs text-zinc-400 mb-2 block">Cost at Different Usage Levels</Label>
            <div className="space-y-1.5">
              {costLevels.map(level => (
                <div
                  key={level.label}
                  className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-300 font-medium">{level.label}</span>
                    <span className="text-zinc-600">
                      {level.input.toLocaleString()} in / {level.output.toLocaleString()} out
                    </span>
                  </div>
                  <span className="text-zinc-200 font-mono">${level.cost.toFixed(6)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedModel && (
        <div className="text-sm text-zinc-500 py-4 text-center">
          Select a model to calculate costs
        </div>
      )}
    </div>
  );
}

// ============ Model Cost Bar ============

function ModelCostBar({ data, maxCost }: { data: ModelCostBreakdown; maxCost: number }) {
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

// ============ Trend Chart ============

function TrendChart({ data, isMobile }: { data: DailyCostTrend[]; isMobile: boolean }) {
  const maxCost = Math.max(...data.map(d => d.totalCostUsd), 0.0001);

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((d, i) => {
        const height = maxCost > 0 ? (d.totalCostUsd / maxCost) * 100 : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group"
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
            <div className="absolute bottom-full mb-2 hidden group-hover:block">
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

