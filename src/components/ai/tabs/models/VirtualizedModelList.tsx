import { useState, useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Check, Brain, Image } from 'lucide-react';
import { type OpenRouterModel } from '../../../../api/ai';
import { cn } from '../../../../lib/utils';
import { ProviderLogo } from '../../ProviderLogo';

interface VirtualizedModelListProps {
  models: OpenRouterModel[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  isMobile: boolean;
}

export function VirtualizedModelList({
  models,
  selectedSlug,
  onSelect,
  isMobile,
}: VirtualizedModelListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const ITEM_HEIGHT = isMobile ? 80 : 72;

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const model = models[index];
    if (!model) return null;

    const isSelected = model.slug === selectedSlug;
    const isFree = model.endpoint?.is_free;
    const hasReasoning = model.supports_reasoning || model.endpoint?.supports_reasoning;
    const hasVision = model.input_modalities?.includes('image');
    const [provider] = model.slug.split('/');

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
      if (perMillion < 0.01) return '<$0.01';
      return `$${perMillion.toFixed(2)}`;
    };

    return (
      <div style={style} className="px-4 py-1">
        <button
          onClick={() => onSelect(model.slug)}
          className={cn(
            'w-full flex items-center gap-4 rounded-xl border p-3 text-left transition-all',
            isSelected
              ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20'
              : 'border-zinc-800/40 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700'
          )}
        >
          {/* Provider Badge */}
          <ProviderLogo provider={provider} size="md" selected={isSelected} />

          {/* Model Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm text-zinc-100 truncate">
                {model.short_name || model.name}
              </span>
              {isFree && (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 shrink-0">
                  FREE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span className="font-medium">{provider}</span>
              <span className="text-zinc-700">•</span>
              {model.endpoint ? (
                <>
                  <span>{formatContext(model.context_length)} ctx</span>
                  <span className="text-zinc-700">•</span>
                  <span>{formatPrice(model.endpoint?.pricing?.prompt)}/M</span>
                </>
              ) : (
                <span>Metadata not available</span>
              )}
            </div>
          </div>

          {/* Capability Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasVision && <Image className="h-4 w-4 text-blue-400" />}
            {hasReasoning && <Brain className="h-4 w-4 text-amber-400" />}
            {isSelected && <Check className="h-5 w-5 text-violet-400 ml-1" />}
          </div>
        </button>
      </div>
    );
  }, [models, selectedSlug, onSelect]);

  return (
    <div ref={containerRef} className="h-full">
      <List
        ref={listRef}
        height={listHeight}
        width="100%"
        itemCount={models.length}
        itemSize={ITEM_HEIGHT}
        overscanCount={5}
      >
        {Row}
      </List>
    </div>
  );
}

