/**
 * Models Tab - Model Management Dashboard
 * 
 * A comprehensive dashboard for viewing and managing AI models.
 * Shows detailed stats, capabilities, and allows model selection.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { 
  Search, Cpu, Brain, ArrowRight, ArrowLeft,
  DollarSign, Check, RefreshCw,
  Zap, X, Image, Mic, Video, Sparkles
} from 'lucide-react';
import { openRouterModels, aiProviders, type OpenRouterModel } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { cn } from '../../../lib/utils';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { addToRecentModels } from '../QuickActionsBar';

interface ModelsTabProps {
  isMobile: boolean;
  activeProviderId?: string | null;
}

// ============ Main Component ============

export function ModelsTab({ isMobile, activeProviderId }: ModelsTabProps) {
  const [mode, setMode] = useState<'dashboard' | 'browse'>('dashboard');
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  
  // Get currently selected model from localStorage
  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return 'openai/gpt-4o-mini';
    return localStorage.getItem('tavernstudio:selectedModel') || 'openai/gpt-4o-mini';
  });

  // Fetch OpenRouter models (always fetch for dashboard stats)
  const { data: openRouterModelsData, isLoading: isLoadingOpenRouter, refetch: refetchOpenRouter, isFetching } = useQuery({
    queryKey: queryKeys.openRouterModels.list(),
    queryFn: () => openRouterModels.list().then(r => r.models),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch provider-specific models if an active provider is set
  const { data: providerModelsData, isLoading: isLoadingProviderModels } = useQuery({
    queryKey: ['aiProviders', 'models', activeProviderId],
    queryFn: () => activeProviderId ? aiProviders.listModels(activeProviderId).then(r => r.models) : Promise.resolve([]),
    enabled: !!activeProviderId && activeProviderId !== 'openrouter',
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

    if (activeProviderId && activeProviderId !== 'openrouter' && pModels.length > 0) {
      return pModels.map(pm => {
        const cleanedPmId = cleanModelId(pm.id);
        
        const match = orModels.find(om => {
          if (om.slug === pm.id) return true;
          if (om.slug === `${activeProviderId}/${pm.id}`) return true;
          if (om.slug.endsWith(`/${pm.id}`)) return true;
          
          const omModelPart = om.slug.split('/').pop() || om.slug;
          const cleanedOmId = cleanModelId(omModelPart);
          return cleanedOmId === cleanedPmId;
        });

        if (match) {
          return { ...match, name: pm.label || match.name };
        }

        return {
          slug: `${activeProviderId}/${pm.id}`,
          name: pm.label,
          short_name: pm.label,
          author: activeProviderId,
          description: '',
          context_length: 128000,
          input_modalities: ['text'],
          output_modalities: ['text'],
          group: activeProviderId,
          supports_reasoning: false,
          hidden: false,
          permaslug: pm.id,
        } as OpenRouterModel;
      });
    }

    return orModels;
  }, [openRouterModelsData, providerModelsData, activeProviderId, cleanModelId]);

  const isLoading = isLoadingOpenRouter || isLoadingProviderModels;

  // Filter models for browse mode
  const filteredModels = useMemo(() => {
    if (mode !== 'browse') return [];
    
    let result = models;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) ||
        (m.short_name || '').toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q)
      );
    }

    if (providerFilter) {
      result = result.filter(m => {
        const author = m.author.toLowerCase();
        const group = (m.group || '').toLowerCase();
        return author.includes(providerFilter) || group.includes(providerFilter);
      });
    }

    if (showFreeOnly) {
      result = result.filter(m => m.endpoint?.is_free);
    }

    return result;
  }, [mode, models, search, providerFilter, showFreeOnly]);

  // Find current model
  const currentModel = useMemo(() => {
    if (!selectedModelSlug) return null;
    if (models.length > 0) {
      return models.find(m => m.slug === selectedModelSlug) || null;
    }
    return null;
  }, [selectedModelSlug, models]);

  const handleSelectModel = useCallback((slug: string) => {
    localStorage.setItem('tavernstudio:selectedModel', slug);
    addToRecentModels(slug);
    setSelectedModelSlug(slug);
    setMode('dashboard');
    window.dispatchEvent(new Event('storage'));
  }, []);

  // ============ DASHBOARD MODE ============
  if (mode === 'dashboard') {
    return (
      <div className={cn('h-full flex flex-col overflow-auto', isMobile ? 'p-4' : 'p-6')}>
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Model Dashboard</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {models.length > 0 ? `${models.length} models available` : 'Loading models...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchOpenRouter()}
              disabled={isFetching}
              className="gap-2 border-zinc-800"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              {isFetching ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              onClick={() => setMode('browse')}
              className="gap-2 bg-violet-600 hover:bg-violet-500"
            >
              <Search className="h-4 w-4" />
              Browse Models
            </Button>
          </div>
        </div>

        {/* Active Model Section */}
        {currentModel ? (
          <ActiveModelDashboard 
            model={currentModel} 
            onChangeModel={() => setMode('browse')}
          />
        ) : selectedModelSlug ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Zap className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-zinc-500 mb-1">
                  {selectedModelSlug.split('/')[0]}
                </div>
                <h3 className="text-xl font-bold text-zinc-100">
                  {selectedModelSlug.split('/').pop()}
                </h3>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Model data not available in current catalog. This may be a custom or unlisted model.
            </p>
            <Button variant="outline" onClick={() => setMode('browse')}>
              Select Different Model
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-zinc-800 p-12 text-center">
            <Cpu className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-400 mb-2">No Model Selected</h3>
            <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
              Select an AI model to power your conversations. Browse from hundreds of options including GPT-4, Claude, Llama, and more.
            </p>
            <Button onClick={() => setMode('browse')} className="gap-2">
              <Search className="h-4 w-4" />
              Browse Models
            </Button>
          </div>
        )}

        {/* Recent Models */}
        <RecentModelsGrid 
          onSelect={handleSelectModel}
          currentSlug={selectedModelSlug}
          allModels={models}
        />
      </div>
    );
  }

  // ============ BROWSE MODE ============
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-zinc-800/50 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMode('dashboard'); setSearch(''); setProviderFilter(null); }}
          className="h-9 px-3 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-zinc-100">Model Browser</h3>
          <p className="text-xs text-zinc-500">
            {isLoading ? 'Loading...' : `${filteredModels.length} models`}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="shrink-0 p-4 border-b border-zinc-800/30 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models by name, provider, or capability..."
            className="pl-10 pr-10 bg-zinc-900/50 border-zinc-800/60 h-11"
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

        <div className="flex gap-2 flex-wrap">
          <FilterPill active={!providerFilter} onClick={() => setProviderFilter(null)} label="All Providers" />
          {['openai', 'anthropic', 'google', 'x-ai', 'meta', 'mistral', 'deepseek'].map(p => (
            <FilterPill
              key={p}
              active={providerFilter === p}
              onClick={() => setProviderFilter(providerFilter === p ? null : p)}
              label={p === 'xai' ? 'xAI' : p.charAt(0).toUpperCase() + p.slice(1)}
            />
          ))}
          <div className="w-px h-7 bg-zinc-800 mx-1 self-center" />
          <FilterPill
            active={showFreeOnly}
            onClick={() => setShowFreeOnly(!showFreeOnly)}
            label="Free Only"
            icon={<DollarSign className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Model List */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-500">Loading model catalog...</p>
            </div>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Search className="h-10 w-10 text-zinc-700 mx-auto" />
              <p className="text-sm text-zinc-500">No models match your filters</p>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setProviderFilter(null); setShowFreeOnly(false); }}>
                Clear all filters
              </Button>
            </div>
          </div>
        ) : (
          <VirtualizedModelList
            models={filteredModels}
            selectedSlug={selectedModelSlug}
            onSelect={handleSelectModel}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}

// ============ Active Model Dashboard ============

function ActiveModelDashboard({ 
  model, 
  onChangeModel
}: { 
  model: OpenRouterModel; 
  onChangeModel: () => void;
}) {
  const formatContext = (ctx: number) => {
    if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return String(ctx);
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price) return 'Free';
    const p = typeof price === 'string' ? parseFloat(price) : price;
    if (p === 0 || isNaN(p)) return 'Free';
    const perMillion = p * 1_000_000;
    if (perMillion < 0.01) return '<$0.01/M';
    return `$${perMillion.toFixed(2)}/M`;
  };

  const inputPrice = model.endpoint?.pricing?.prompt;
  const outputPrice = model.endpoint?.pricing?.completion;
  const isFree = model.endpoint?.is_free;
  const hasReasoning = model.supports_reasoning || model.endpoint?.supports_reasoning;
  const [provider] = model.slug.split('/');
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
            <ProviderLogo provider={provider} size="lg" />
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

// ============ Capability Badge ============

function CapabilityBadge({ 
  icon, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
      active 
        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800'
    )}>
      {icon}
      {label}
    </div>
  );
}

// ============ Recent Models ============

function RecentModelsGrid({ 
  onSelect, 
  currentSlug,
  allModels 
}: { 
  onSelect: (slug: string) => void; 
  currentSlug: string | null;
  allModels: OpenRouterModel[];
}) {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('tavernstudio:recentModels');
      const recent = raw ? JSON.parse(raw) : [];
      const validRecent = (Array.isArray(recent) ? recent : [])
        .filter((s): s is string => typeof s === 'string' && s !== currentSlug)
        .slice(0, 6);
      setRecentSlugs(validRecent);
    } catch {
      setRecentSlugs([]);
    }
  }, [currentSlug]);

  const recentModels = useMemo(() => {
    return recentSlugs.map(slug => {
      const found = allModels.find(m => m.slug === slug);
      return found || { slug, name: slug.split('/').pop() || slug, author: slug.split('/')[0] || 'unknown' };
    });
  }, [recentSlugs, allModels]);

  if (recentModels.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Recently Used</h4>
      <div className="flex flex-wrap gap-2">
        {recentModels.map((model) => {
          const [provider] = model.slug.split('/');
          return (
            <button
              key={model.slug}
              onClick={() => onSelect(model.slug)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900/40 hover:bg-zinc-800/60 px-3 py-2 text-left transition-colors group"
            >
              <ProviderLogo provider={provider} size="sm" />
              <div className="min-w-0">
                <div className="text-xs text-zinc-300 font-medium truncate group-hover:text-zinc-100">
                  {('short_name' in model && model.short_name) || model.name}
                </div>
                <div className="text-[10px] text-zinc-600 truncate">
                  {provider}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Virtualized Model List ============

function VirtualizedModelList({
  models,
  selectedSlug,
  onSelect,
  isMobile,
}: {
  models: OpenRouterModel[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  isMobile: boolean;
}) {
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
      if (!price) return 'Free';
      const p = typeof price === 'string' ? parseFloat(price) : price;
      if (p === 0 || isNaN(p)) return 'Free';
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
              <span>{formatContext(model.context_length)} ctx</span>
              <span className="text-zinc-700">•</span>
              <span>{formatPrice(model.endpoint?.pricing?.prompt)}/M</span>
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

// ============ Filter Pill ============

function FilterPill({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
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

// ============ Provider Logo ============

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '/provider/openai.svg',
  anthropic: '/provider/anthropic.svg',
  google: '/provider/google.svg',
  xai: '/provider/xai.svg',
  'x-ai': '/provider/xai.svg',
};

function getProviderLogo(provider: string): string {
  const key = provider.toLowerCase();
  for (const [p, logo] of Object.entries(PROVIDER_LOGOS)) {
    if (key.includes(p)) return logo;
  }
  return '/provider/openrouter.svg'; // Fallback
}

function getProviderBgStyle(provider: string): string {
  const styles: Record<string, string> = {
    openai: 'bg-white/10 border-white/20',
    anthropic: 'bg-orange-500/10 border-orange-500/20',
    google: 'bg-blue-500/10 border-blue-500/20',
    openrouter: 'bg-white/10 border-white/20',
    'x-ai': 'bg-zinc-800 border-zinc-700',
    xai: 'bg-zinc-800 border-zinc-700',
    meta: 'bg-indigo-500/10 border-indigo-500/20',
    mistral: 'bg-violet-500/10 border-violet-500/20',
    deepseek: 'bg-cyan-500/10 border-cyan-500/20',
    cohere: 'bg-rose-500/10 border-rose-500/20',
  };
  
  const key = provider.toLowerCase();
  for (const [p, style] of Object.entries(styles)) {
    if (key.includes(p)) return style;
  }
  return 'bg-white/10 border-white/20'; // Default to white (OpenRouter style)
}

function ProviderLogo({ 
  provider, 
  size = 'md',
  className,
  selected = false,
}: { 
  provider: string; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
}) {
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-11 w-11 p-2',
    lg: 'h-14 w-14 p-2.5',
  };

  const logoUrl = getProviderLogo(provider);
  const providerKey = provider.toLowerCase();
  
  // Define forced colors for the SVG logos
  let forcedColorClass = "bg-white"; // Default for OpenAI/OpenRouter
  if (providerKey.includes('google')) {
    forcedColorClass = "bg-[#4285F4]"; // Google Blue
  } else if (providerKey.includes('anthropic')) {
    forcedColorClass = "bg-[#D97757]"; // Anthropic Orange
  }

  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center border shrink-0',
      sizeClasses[size],
      selected ? 'bg-violet-500/20 border-violet-500/30' : getProviderBgStyle(provider),
      className
    )}>
      <div 
        className={cn("w-full h-full", forcedColorClass)}
        style={{
          maskImage: `url(${logoUrl})`,
          WebkitMaskImage: `url(${logoUrl})`,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
        }}
      />
    </div>
  );
}
