import { Brain, ArrowRight, Image, Mic, Video, Sparkles } from 'lucide-react';
import { type OpenRouterModel } from '../../../../api/ai';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../ui/button';
import { ProviderLogo } from '../../ProviderLogo';
import { CapabilityBadge } from './CapabilityBadge';
import { useProviderUi } from '../../../../hooks/queries/aiProviders';

interface ActiveModelDashboardProps {
  model: OpenRouterModel;
  onChangeModel: () => void;
}

export function ActiveModelDashboard({ 
  model, 
  onChangeModel
}: ActiveModelDashboardProps) {
  const [provider] = model.slug.split('/');
  const ui = useProviderUi(provider);
  const formatContext = (ctx: number) => {
    if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return String(ctx);
  };

  const formatPrice = (price: string | number | undefined) => {
    if (price === undefined || price === null) return '—';
    const p = typeof price === 'string' ? parseFloat(price) : price;
    if (p === 0) return 'Free';
    if (isNaN(p)) return '—';
    const perMillion = p * 1_000_000;
    if (perMillion < 0.01) return '<$0.01/M';
    return `$${perMillion.toFixed(2)}/M`;
  };

  const inputPrice = model.endpoint?.pricing?.prompt;
  const outputPrice = model.endpoint?.pricing?.completion;
  const isFree = model.endpoint?.is_free;
  const hasReasoning = model.supports_reasoning || model.endpoint?.supports_reasoning;
  const hasVision = model.input_modalities?.includes('image');
  const hasAudioIn = model.input_modalities?.includes('audio');
  const hasImageOut = model.output_modalities?.includes('image');
  const hasAudioOut = model.output_modalities?.includes('audio');

  return (
    <div className="mb-6">
      {/* Model Identity - Single cohesive block */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950/50 p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <ProviderLogo provider={provider} ui={ui} size="lg" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{provider}</span>
                {isFree && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    FREE
                  </span>
                )}
                {hasReasoning && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    REASONING
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-zinc-100">
                {model.short_name || model.name}
              </h3>
              <code className="text-xs text-zinc-600 font-mono mt-0.5 block">
                {model.slug}
              </code>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onChangeModel}
            className="shrink-0 gap-2 border-zinc-700 hover:bg-zinc-800"
          >
            Change Model
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {model.description && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-5">
            {model.description}
          </p>
        )}

        {/* Stats row - properly scaled and centered */}
        <div className={cn(
          "grid py-4 border-t border-zinc-800/60",
          model.endpoint?.max_completion_tokens ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
        )}>
          <div className="flex flex-col items-center justify-center text-center px-4 py-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Context</div>
            <div className="text-lg font-bold text-zinc-100">{formatContext(model.context_length)}</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 py-2 border-l border-zinc-800/60">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Input</div>
            <div className="text-lg font-bold text-zinc-100">{formatPrice(inputPrice)}</div>
          </div>
          <div className={cn(
            "flex flex-col items-center justify-center text-center px-4 py-2 border-zinc-800/60",
            "border-t sm:border-t-0 sm:border-l",
            !model.endpoint?.max_completion_tokens && "col-span-2 sm:col-span-1"
          )}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Output</div>
            <div className="text-lg font-bold text-zinc-100">{formatPrice(outputPrice)}</div>
          </div>
          {model.endpoint?.max_completion_tokens && (
            <div className="flex flex-col items-center justify-center text-center px-4 py-2 border-t border-l sm:border-t-0 border-zinc-800/60">
              <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Max Output</div>
              <div className="text-lg font-bold text-zinc-100">{formatContext(model.endpoint.max_completion_tokens)}</div>
            </div>
          )}
        </div>

        {/* Capabilities - inline badges, no wrapper card */}
        {(hasVision || hasAudioIn || hasImageOut || hasAudioOut || hasReasoning || model.endpoint?.supports_multipart) && (
          <div className="flex flex-wrap gap-1.5 pt-4 border-t border-zinc-800/60">
            {hasVision && (
              <CapabilityBadge icon={<Image className="h-3.5 w-3.5" />} label="Vision" active />
            )}
            {hasAudioIn && (
              <CapabilityBadge icon={<Mic className="h-3.5 w-3.5" />} label="Audio In" active />
            )}
            {hasImageOut && (
              <CapabilityBadge icon={<Image className="h-3.5 w-3.5" />} label="Image Gen" active />
            )}
            {hasAudioOut && (
              <CapabilityBadge icon={<Video className="h-3.5 w-3.5" />} label="Audio Out" active />
            )}
            {hasReasoning && (
              <CapabilityBadge icon={<Brain className="h-3.5 w-3.5" />} label="Reasoning" active />
            )}
            {model.endpoint?.supports_multipart && (
              <CapabilityBadge icon={<Sparkles className="h-3.5 w-3.5" />} label="Multipart" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

