import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { openRouterModels } from '../../../../api/client';
import { queryKeys } from '../../../../lib/queryClient';
import { cn } from '../../../../lib/utils';
import { Label } from '../../../ui/label';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

interface CostCalculatorProps {
  isMobile: boolean;
}

export function CostCalculator({ isMobile }: CostCalculatorProps) {
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

