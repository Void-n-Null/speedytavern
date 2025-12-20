/**
 * Provider Routing Configuration Panel
 * 
 * Allows users to configure OpenRouter's provider routing options including:
 * - Provider order (priority)
 * - Provider ignore/allow lists
 * - Fallback behavior
 * - Quantization preferences
 * 
 * Uses actual provider data from the OpenRouter API when available.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Server, ShieldOff, ShieldCheck, Shuffle, Layers, X, Plus } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Switch } from '../../../ui/switch';
import { Input } from '../../../ui/input';
import { Button } from '../../../ui/button';
import type { OpenRouterProviderConfig } from '../../../../types/profile';

// Fallback list of known OpenRouter infrastructure providers (used when no model data available)
const FALLBACK_PROVIDERS = [
  'anthropic',
  'openai', 
  'google-vertex',
  'google-ai-studio',
  'together',
  'deepinfra',
  'fireworks',
  'groq',
  'azure',
  'amazon-bedrock',
  'perplexity',
  'mistral',
  'cohere',
  'novita',
  'featherless',
  'xai',
] as const;

// Available quantization levels
const QUANTIZATIONS = ['fp32', 'fp16', 'bf16', 'int8', 'int4', 'fp8'] as const;

interface ProviderRoutingConfigProps {
  config: OpenRouterProviderConfig;
  onChange: (config: OpenRouterProviderConfig) => void;
  disabled?: boolean;
  /**
   * Provider slugs OpenRouter indicates are available/preferred for this model (from default_order).
   * Note: this may be incomplete; users can still enter custom provider slugs.
   */
  supportedProviders?: string[];
  /** Current model's endpoint provider slug */
  currentProviderSlug?: string;
  /** All unique provider slugs from available models */
  allProviderSlugs?: string[];
}

export function ProviderRoutingConfig({
  config,
  onChange,
  disabled = false,
  supportedProviders = [],
  currentProviderSlug,
  allProviderSlugs = [],
}: ProviderRoutingConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newProvider, setNewProvider] = useState('');
  const [filterMode, setFilterMode] = useState<'ignore' | 'allow'>(
    config.allow && config.allow.length > 0 ? 'allow' : 'ignore'
  );

  // Compute available providers: recommended first, then others, with fallback
  const availableProviders = useMemo(() => {
    // If we have supported providers from the model, use those primarily
    if (supportedProviders.length > 0) {
      // Extract base provider names (without quantization suffix)
      const baseProviders = new Set<string>();
      for (const slug of supportedProviders) {
        const base = slug.split('/')[0];
        baseProviders.add(base);
      }
      // Add current provider if available
      if (currentProviderSlug) {
        const base = currentProviderSlug.split('/')[0];
        baseProviders.add(base);
      }
      return Array.from(baseProviders);
    }

    // If we have allProviderSlugs from models, extract unique base providers
    if (allProviderSlugs.length > 0) {
      const baseProviders = new Set<string>();
      for (const slug of allProviderSlugs) {
        if (slug) {
          const base = slug.split('/')[0];
          baseProviders.add(base);
        }
      }
      return Array.from(baseProviders).sort();
    }

    // Fallback to static list
    return [...FALLBACK_PROVIDERS];
  }, [supportedProviders, currentProviderSlug, allProviderSlugs]);

  const handleToggleProvider = (provider: string, list: 'order' | 'ignore' | 'allow') => {
    const currentList = config[list] ?? [];
    const newList = currentList.includes(provider)
      ? currentList.filter(p => p !== provider)
      : [...currentList, provider];
    
    onChange({ ...config, [list]: newList.length > 0 ? newList : undefined });
  };

  const handleAddCustomProvider = () => {
    const trimmed = newProvider.trim().toLowerCase();
    if (!trimmed) return;
    
    const targetList = filterMode === 'allow' ? 'allow' : 'ignore';
    const currentList = config[targetList] ?? [];
    
    if (!currentList.includes(trimmed)) {
      onChange({ ...config, [targetList]: [...currentList, trimmed] });
    }
    setNewProvider('');
  };

  const handleRemoveFromOrder = (provider: string) => {
    const newOrder = (config.order ?? []).filter(p => p !== provider);
    onChange({ ...config, order: newOrder.length > 0 ? newOrder : undefined });
  };

  const handleFilterModeChange = (mode: 'ignore' | 'allow') => {
    setFilterMode(mode);
    // Clear the other list when switching modes
    if (mode === 'allow') {
      onChange({ ...config, ignore: undefined });
    } else {
      onChange({ ...config, allow: undefined });
    }
  };

  const handleQuantizationToggle = (quant: string) => {
    const current = config.quantizations ?? [];
    const newQuants = current.includes(quant)
      ? current.filter(q => q !== quant)
      : [...current, quant];
    onChange({ ...config, quantizations: newQuants.length > 0 ? newQuants : undefined });
  };

  const activeFilterList = filterMode === 'allow' ? config.allow : config.ignore;
  const hasAnyConfig = (config.order?.length ?? 0) > 0 || 
                       (config.ignore?.length ?? 0) > 0 || 
                       (config.allow?.length ?? 0) > 0 ||
                       config.allowFallbacks === false ||
                       config.requireParameters === true ||
                       (config.quantizations?.length ?? 0) > 0;

  return (
    <div className={cn(
      'rounded-xl border border-zinc-800/60 bg-transparent',
      disabled && 'opacity-50 pointer-events-none'
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center border',
            hasAnyConfig
              ? 'border-violet-500/30 text-violet-400 bg-violet-500/10'
              : 'border-zinc-800/60 text-zinc-500 bg-zinc-900/10'
          )}>
            <Server className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Provider Routing</h4>
            <p className="text-xs text-zinc-500">
              Advanced configuration (usually leave default)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-800/70 bg-zinc-900/20 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            ADVANCED
          </span>
          {hasAnyConfig && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-400">
              CUSTOM
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-zinc-800/50 pt-4">
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
            <p className="text-xs leading-relaxed text-zinc-500">
              OpenRouter can route a request across multiple infrastructure providers. If you specify a provider that
              doesn’t support the selected model (or required parameters), the request may fail or fall back depending
              on your settings.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Supported Providers for this model
            </label>
            {supportedProviders.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {supportedProviders.map((slug) => (
                  <span
                    key={slug}
                    className="rounded-md border border-zinc-800/70 bg-zinc-900/20 px-2 py-1 text-xs text-zinc-300"
                    title={slug}
                  >
                    {slug}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 leading-relaxed">
                We don’t have a reliable “all providers for this model” list from the data we fetch. Not all providers
                will support every model—use provider slugs you trust (or check the model page) and verify by trying a
                request.
              </p>
            )}
          </div>

          {/* Provider Order */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Shuffle className="h-4 w-4 text-zinc-500" />
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Provider Priority
              </label>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Select providers in order of preference. First available will be used.
            </p>
            
            {/* Current order */}
            {(config.order?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {config.order?.map((provider, idx) => (
                  <span
                    key={provider}
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 border border-violet-500/25 px-2.5 py-1 text-xs font-medium text-violet-300"
                  >
                    <span className="text-[10px] text-violet-400/60">{idx + 1}.</span>
                    {provider}
                    <button
                      onClick={() => handleRemoveFromOrder(provider)}
                      className="ml-0.5 hover:text-violet-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Provider chips to add */}
            <div className="flex flex-wrap gap-1.5">
              {availableProviders.filter(p => !(config.order ?? []).includes(p)).slice(0, 16).map(provider => (
                <button
                  key={provider}
                  onClick={() => handleToggleProvider(provider, 'order')}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    supportedProviders.some(sp => sp.startsWith(provider))
                      ? 'border-zinc-700/70 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-800/30'
                      : 'border-zinc-800/60 text-zinc-400 bg-transparent hover:bg-zinc-900/20 hover:text-zinc-300'
                  )}
                >
                  <Plus className="h-3 w-3 inline mr-1 opacity-50" />
                  {provider}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Filter (Ignore/Allow) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              {filterMode === 'ignore' ? (
                <ShieldOff className="h-4 w-4 text-zinc-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-zinc-500" />
              )}
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Provider Filter
              </label>
            </div>
            
            {/* Mode toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => handleFilterModeChange('ignore')}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors border',
                  filterMode === 'ignore'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-400'
                )}
              >
                <ShieldOff className="h-3.5 w-3.5 inline mr-1.5" />
                Ignore List
              </button>
              <button
                onClick={() => handleFilterModeChange('allow')}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors border',
                  filterMode === 'allow'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-400'
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5 inline mr-1.5" />
                Allow Only
              </button>
            </div>

            <p className="text-xs text-zinc-600 mb-3">
              {filterMode === 'ignore' 
                ? 'Requests will never be routed to these providers.'
                : 'Requests will only be routed to these providers.'}
            </p>

            {/* Current filter list */}
            {(activeFilterList?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {activeFilterList?.map(provider => (
                  <span
                    key={provider}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                      filterMode === 'ignore'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    )}
                  >
                    {provider}
                    <button
                      onClick={() => handleToggleProvider(provider, filterMode)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add provider input */}
            <div className="flex gap-2">
              <Input
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomProvider()}
                placeholder="Enter provider slug..."
                className="flex-1 h-9 text-xs bg-zinc-800/50 border-zinc-700/50"
              />
              <Button
                onClick={handleAddCustomProvider}
                size="sm"
                variant="outline"
                className="h-9 border-zinc-700"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Quantization Preferences */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-zinc-500" />
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Quantization
              </label>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Restrict to specific model quantization levels. Leave empty for any.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUANTIZATIONS.map(quant => (
                <button
                  key={quant}
                  onClick={() => handleQuantizationToggle(quant)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                    (config.quantizations ?? []).includes(quant)
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-400'
                  )}
                >
                  {quant}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/50">
            {/* Allow Fallbacks */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-300">Allow Fallbacks</label>
                <p className="text-xs text-zinc-600">
                  Automatically try other providers if primary is unavailable
                </p>
              </div>
              <Switch
                checked={config.allowFallbacks !== false}
                onCheckedChange={(checked) => 
                  onChange({ ...config, allowFallbacks: checked ? undefined : false })
                }
              />
            </div>

            {/* Require Parameters */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-zinc-300">Require Parameter Support</label>
                <p className="text-xs text-zinc-600">
                  Only use providers that support all request parameters
                </p>
              </div>
              <Switch
                checked={config.requireParameters === true}
                onCheckedChange={(checked) => 
                  onChange({ ...config, requireParameters: checked ? true : undefined })
                }
              />
            </div>
          </div>

          {/* Reset button */}
          {hasAnyConfig && (
            <div className="pt-2 border-t border-zinc-800/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({})}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Reset to Defaults
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

