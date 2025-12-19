/**
 * Model Selector
 * 
 * A compact, virtualized model picker for use in forms and dialogs.
 * Defers loading until interaction, uses virtualization for performance.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { Search, Brain, X, ChevronDown, Zap } from 'lucide-react';
import { openRouterModels, aiProviders, type OpenRouterModel } from '../../api/ai';
import { queryKeys } from '../../lib/queryClient';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelSlug: string) => void;
  className?: string;
  providerId?: string | null;
}

// Format context length for display
function formatContextLength(length: number): string {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  if (length >= 1000) return `${Math.round(length / 1000)}K`;
  return String(length);
}

// Format pricing for display (price per 1M tokens)
function formatPrice(priceStr: string | number | undefined): string {
  if (priceStr === undefined || priceStr === null) return '—';
  const price = typeof priceStr === 'string' ? parseFloat(priceStr) : priceStr;
  if (price === 0) return 'Free';
  if (isNaN(price)) return '—';
  const perMillion = price * 1000000;
  if (perMillion < 0.01) return '<$0.01';
  return `$${perMillion.toFixed(2)}`;
}

// Provider colors
const providerColors: Record<string, string> = {
  openai: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  google: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  meta: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  mistral: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  deepseek: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

function getProviderColor(author: string): string {
  const key = author.toLowerCase();
  for (const [provider, color] of Object.entries(providerColors)) {
    if (key.includes(provider)) return color;
  }
  return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
}

export function ModelSelector({ value, onChange, className, providerId }: ModelSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only fetch models when expanded (deferred loading)
  const { data: openRouterModelsData, isLoading: isLoadingOpenRouter } = useQuery({
    queryKey: queryKeys.openRouterModels.list(),
    queryFn: () => openRouterModels.list().then(r => r.models),
    enabled: isExpanded,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch provider-specific models if a providerId is provided
  const { data: providerModelsData, isLoading: isLoadingProviderModels } = useQuery({
    queryKey: ['aiProviders', 'models', providerId],
    queryFn: () => providerId ? aiProviders.listModels(providerId).then(r => r.models) : Promise.resolve([]),
    enabled: isExpanded && !!providerId && providerId !== 'openrouter',
    staleTime: 10 * 60 * 1000,
  });

  // Clean model ID for fuzzy matching
  // Handles: claude-opus-4-5-20251101 → claudeopus45
  //          claude-opus-4.5 → claudeopus45
  const cleanModelId = useCallback((id: string): string => {
    return id
      .toLowerCase()
      // First: Remove date suffixes like -20251101 or -20250929 (YYYYMMDD pattern)
      .replace(/[-_]?20\d{6}/g, '')
      // Remove any remaining 6+ digit sequences (other date formats)
      .replace(/\d{6,}/g, '')
      // Now remove punctuation (dashes, dots, underscores)
      .replace(/[-_.]/g, '')
      // Trim any trailing/leading whitespace
      .trim();
  }, []);

  const models = useMemo(() => {
    const orModels = openRouterModelsData ?? [];
    const pModels = providerModelsData ?? [];

    if (providerId && providerId !== 'openrouter' && pModels.length > 0) {
      return pModels
        .map(pm => {
          const cleanedPmId = cleanModelId(pm.id);
          
          // Try to find matching model in OpenRouter catalog
          const match = orModels.find(om => {
            // Exact matches
            if (om.slug === pm.id) return true;
            if (om.slug === `${providerId}/${pm.id}`) return true;
            if (om.slug.endsWith(`/${pm.id}`)) return true;
            
            // Fuzzy match: clean both IDs and compare
            const omModelPart = om.slug.split('/').pop() || om.slug;
            const cleanedOmId = cleanModelId(omModelPart);
            return cleanedOmId === cleanedPmId;
          });

          if (match) {
            return { ...match, name: pm.label || match.name };
          }

          return {
            slug: pm.id.includes('/') ? pm.id : `${providerId}/${pm.id}`,
            name: pm.label,
            short_name: pm.label,
            author: providerId,
            description: '',
            context_length: 128000,
            input_modalities: ['text'],
            output_modalities: ['text'],
            group: providerId,
            supports_reasoning: false,
            hidden: false,
            permaslug: pm.id,
          } as OpenRouterModel;
        })
        .filter(m => !m.endpoint?.is_free);
    }

    return orModels;
  }, [openRouterModelsData, providerModelsData, providerId, cleanModelId]);

  const isLoading = isLoadingOpenRouter || isLoadingProviderModels;

  // Filter models
  const filteredModels = useMemo(() => {
    let result = models;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        (m.group || '').toLowerCase().includes(q)
      );
    }

    const effectiveProviderFilter = providerFilter || (providerId && providerId !== 'openrouter' ? providerId : null);

    if (effectiveProviderFilter) {
      result = result.filter(m => {
        const author = m.author.toLowerCase();
        return author.includes(effectiveProviderFilter);
      });
    }

    // Sort: selected first, then alphabetically
    return [...result].sort((a, b) => {
      if (a.slug === value) return -1;
      if (b.slug === value) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models, search, providerFilter, providerId, value]);

  const selectedModel = useMemo(() => {
    // Check models list first
    const found = models.find(m => m.slug === value);
    if (found) return found;

    // If we have openRouterModelsData but not in current filtered list, try searching everything
    return openRouterModelsData?.find(m => m.slug === value) || null;
  }, [models, openRouterModelsData, value]);

  // Handle click outside to close
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handleSelect = useCallback((model: OpenRouterModel) => {
    onChange(model.slug);
    setIsExpanded(false);
    setSearch('');
  }, [onChange]);

  const ITEM_HEIGHT = 56;

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const model = filteredModels[index];
    if (!model) return null;

    const isSelected = model.slug === value;
    const isFree = model.endpoint?.is_free;

    return (
      <div style={style} className="px-2">
        <button
          onClick={() => handleSelect(model)}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all h-[48px]',
            isSelected
              ? 'border-violet-500/50 bg-violet-500/10'
              : 'border-transparent hover:bg-zinc-800/50'
          )}
        >
          <div className={cn(
            'h-7 w-7 rounded flex items-center justify-center text-[9px] font-bold uppercase shrink-0',
            getProviderColor(model.author)
          )}>
            {model.author.slice(0, 2)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-zinc-200 truncate">
                {model.short_name || model.name}
              </span>
              {isFree && (
                <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-400">
                  FREE
                </span>
              )}
              {model.supports_reasoning && (
                <Brain className="h-3 w-3 text-amber-400" />
              )}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">
              {model.endpoint ? (
                <>{formatContextLength(model.context_length)} ctx • {formatPrice(model.endpoint?.pricing?.prompt)}/M</>
              ) : (
                'Metadata not available'
              )}
            </div>
          </div>
        </button>
      </div>
    );
  }, [filteredModels, value, handleSelect]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Collapsed: Show selected model */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
          isExpanded
            ? 'border-violet-500/50 bg-violet-500/5'
            : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
        )}
      >
        {selectedModel ? (
          <>
            <div className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase shrink-0',
              getProviderColor(selectedModel.author)
            )}>
              {selectedModel.author.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-100 truncate">
                {selectedModel.short_name || selectedModel.name}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono truncate">
                {selectedModel.slug}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-400">Select a model...</div>
            </div>
          </>
        )}
        <ChevronDown className={cn(
          'h-4 w-4 text-zinc-500 transition-transform shrink-0',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded: Model browser */}
      {isExpanded && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
                className="pl-9 pr-9 bg-zinc-900/50 border-zinc-800/60 h-9"
                autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

            {/* Quick filters - Only show for OpenRouter */}
            {(providerId === 'openrouter' || !providerId) && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['openai', 'anthropic', 'google', 'meta'].map(p => (
                  <button
                    key={p}
                    onClick={() => setProviderFilter(providerFilter === p ? null : p)}
                    className={cn(
                      'rounded px-2 py-0.5 text-[10px] font-medium transition-colors capitalize',
                      providerFilter === p
                        ? 'bg-violet-500/20 text-violet-300'
                        : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-400'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
      </div>

          {/* Virtualized list */}
          <div className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-zinc-500">
                Loading models...
              </div>
        ) : filteredModels.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-zinc-500">
                No models found
          </div>
        ) : (
              <List
                height={320}
                width="100%"
                itemCount={filteredModels.length}
                itemSize={ITEM_HEIGHT}
                overscanCount={5}
              >
                {Row}
              </List>
        )}
      </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-zinc-800/50 text-[10px] text-zinc-600">
          {filteredModels.length} of {models.length} models
          </div>
        </div>
      )}
    </div>
  );
}
