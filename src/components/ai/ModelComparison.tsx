/**
 * Model Comparison
 * 
 * Side-by-side comparison of multiple models.
 */

import { useMemo } from 'react';
import { 
  X, DollarSign, Infinity, FileText, Image, Mic, Brain, 
  Check, Minus, Sparkles
} from 'lucide-react';
import type { OpenRouterModel } from '../../api/client';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface ModelComparisonProps {
  models: OpenRouterModel[];
  onRemoveModel: (modelId: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

const comparisonFields = [
  { key: 'context_length', label: 'Context Length', format: formatContext },
  { key: 'endpoint.pricing.prompt', label: 'Input Price (/M)', format: (v: number | undefined) => formatPrice(v ?? 0) },
  { key: 'endpoint.pricing.completion', label: 'Output Price (/M)', format: (v: number | undefined) => formatPrice(v ?? 0) },
  { key: 'endpoint.is_free', label: 'Free Tier', format: formatBoolean },
  { key: 'supports_reasoning', label: 'Reasoning', format: formatBoolean },
  { key: 'input_modalities', label: 'Input Types', format: formatModalities },
  { key: 'output_modalities', label: 'Output Types', format: formatModalities },
  { key: 'author', label: 'Author', format: (v: string) => v || '—' },
  { key: 'group', label: 'Model Family', format: (v: string) => v || '—' },
] as const;

function formatContext(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
  return String(ctx);
}

function formatPrice(price: any): string {
  const p = typeof price === 'string' ? parseFloat(price) : price;
  if (p === 0 || isNaN(p)) return 'Free';
  const perMillion = p * 1_000_000;
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  return `$${perMillion.toFixed(2)}`;
}

function formatBoolean(val: boolean): React.ReactNode {
  return val ? (
    <Check className="h-4 w-4 text-emerald-400" />
  ) : (
    <Minus className="h-4 w-4 text-zinc-600" />
  );
}

function formatModalities(mods: string[] | undefined | null): React.ReactNode {
  if (!mods || mods.length === 0) return <span className="text-zinc-600">—</span>;
  
  const icons: Record<string, React.ReactNode> = {
    text: <FileText className="h-3.5 w-3.5" />,
    image: <Image className="h-3.5 w-3.5" />,
    audio: <Mic className="h-3.5 w-3.5" />,
  };

  return (
    <div className="flex gap-1.5 flex-wrap justify-center">
      {mods.map((m, i) => (
        <span
          key={`${m}-${i}`}
          className="flex items-center gap-1 rounded bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
        >
          {icons[m] || <Sparkles className="h-3.5 w-3.5" />}
          {m}
        </span>
      ))}
    </div>
  );
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function ModelComparison({ models, onRemoveModel, onClose, isMobile }: ModelComparisonProps) {
  // Find best values for highlighting
  const bestValues = useMemo(() => {
    const best: Record<string, string> = {};

    // Lowest input price (excluding 0 which means free)
    const inputPrices = models.map(m => parseFloat(m.endpoint?.pricing?.prompt || '0')).filter(p => p > 0);
    if (inputPrices.length > 0) {
      const min = Math.min(...inputPrices);
      const bestModel = models.find(m => parseFloat(m.endpoint?.pricing?.prompt || '0') === min);
      if (bestModel) best['endpoint.pricing.prompt'] = bestModel.slug;
    }

    // Lowest output price
    const outputPrices = models.map(m => parseFloat(m.endpoint?.pricing?.completion || '0')).filter(p => p > 0);
    if (outputPrices.length > 0) {
      const min = Math.min(...outputPrices);
      const bestModel = models.find(m => parseFloat(m.endpoint?.pricing?.completion || '0') === min);
      if (bestModel) best['endpoint.pricing.completion'] = bestModel.slug;
    }

    // Highest context
    const maxCtx = Math.max(...models.map(m => m.context_length ?? 0));
    const ctxModel = models.find(m => m.context_length === maxCtx);
    if (ctxModel) best['context_length'] = ctxModel.slug;

    return best;
  }, [models]);

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={cn(
        'relative rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col',
        isMobile ? 'w-full h-full' : 'w-full max-w-4xl max-h-[85vh]'
      )}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
          <h2 className="text-lg font-bold text-zinc-100">Model Comparison</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            {/* Model headers */}
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="border-b border-zinc-800/50">
                <th className="p-3 text-left text-xs font-medium text-zinc-500 w-32">
                  Attribute
                </th>
                {models.map(model => (
                  <th key={model.slug} className="p-3 text-center min-w-[150px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        {model.endpoint?.provider_display_name && (
                           <div className="text-[10px] font-bold uppercase">{model.endpoint.provider_display_name.slice(0, 2)}</div>
                        )}
                        <span className="font-semibold text-zinc-100 text-sm">
                          {model.short_name || model.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {model.endpoint?.is_free && (
                          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                            Free
                          </span>
                        )}
                        {(model.supports_reasoning || model.endpoint?.supports_reasoning) && (
                          <span className="rounded-full bg-amber-500/20 p-0.5">
                            <Brain className="h-3 w-3 text-amber-400" />
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveModel(model.slug)}
                        className="h-6 text-[10px] text-zinc-500 hover:text-red-400"
                      >
                        Remove
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Comparison rows */}
            <tbody>
              {comparisonFields.map((field, idx) => (
                <tr
                  key={field.key}
                  className={cn(
                    'border-b border-zinc-800/30',
                    idx % 2 === 0 ? 'bg-zinc-900/20' : 'bg-transparent'
                  )}
                >
                  <td className="p-3 text-xs font-medium text-zinc-400">
                    {field.label}
                  </td>
                  {models.map(model => {
                    const value = getNestedValue(model, field.key);
                    const isBest = bestValues[field.key] === model.slug;
                    const formatted = field.format(value);

                    return (
                      <td
                        key={model.slug}
                        className={cn(
                          'p-3 text-center text-sm',
                          isBest ? 'text-violet-300 font-medium' : 'text-zinc-300'
                        )}
                      >
                        {typeof formatted === 'string' ? (
                          <span>{formatted}</span>
                        ) : (
                          <div className="flex justify-center">{formatted}</div>
                        )}
                        {isBest && (
                          <div className="text-[10px] text-violet-400 mt-0.5">Best</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-4 py-2 border-t border-zinc-800/50 text-xs text-zinc-500 text-center">
          Select models in the Models tab to add them here
        </div>
      </div>
    </div>
  );
}

