/**
 * Models Tab - Model Management Dashboard
 * 
 * A comprehensive dashboard for viewing and managing AI models.
 * Shows detailed stats, capabilities, and allows model selection.
 */

import { Search, Cpu, ArrowLeft, DollarSign, RefreshCw, AlertCircle, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { useModelsTab } from './models/useModelsTab';
import { ActiveModelDashboard } from './models/ActiveModelDashboard';
import { RecentModelsGrid } from './models/RecentModelsGrid';
import { VirtualizedModelList } from './models/VirtualizedModelList';
import { FilterPill } from './models/FilterPill';
import { ProviderRoutingConfig } from './models/ProviderRoutingConfig';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useActiveProfile, useUpdateAiConfig } from '../../../hooks/queries/profiles';
import type { OpenRouterProviderConfig } from '../../../types/profile';

interface ModelsTabProps {
  activeProviderId?: string | null;
  activeProviderLabel?: string | null;
  /** Currently selected model ID from the profile's AI config */
  selectedModelId?: string | null;
  /** Callback when user selects a model - updates the profile's AI config */
  onSelectModel?: (modelId: string) => void;
}

export function ModelsTab({ 
  activeProviderId, 
  activeProviderLabel,
  selectedModelId,
  onSelectModel,
}: ModelsTabProps) {
  const isMobile = useIsMobile();
  const {
    mode,
    setMode,
    search,
    setSearch,
    providerFilter,
    setProviderFilter,
    showFreeOnly,
    setShowFreeOnly,
    models,
    isLoading,
    isFetching,
    filteredModels,
    currentModel,
    handleSelectModel,
    refetchOpenRouter,
  } = useModelsTab({ activeProviderId, selectedModelId, onSelectModel });

  // Get profile and AI config for provider routing configuration
  const { data: profile } = useActiveProfile();
  const updateAiConfig = useUpdateAiConfig();
  
  const activeAiConfig = profile?.aiConfigs.find(c => c.id === profile.activeAiConfigId);
  const providerRoutingConfig = (activeAiConfig?.providerConfig ?? {}) as OpenRouterProviderConfig;

  const handleProviderRoutingChange = (newConfig: OpenRouterProviderConfig) => {
    if (!profile || !activeAiConfig) return;
    
    updateAiConfig.mutate({
      profileId: profile.id,
      configId: activeAiConfig.id,
      data: { providerConfig: newConfig as Record<string, unknown> },
    });
  };

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
        ) : selectedModelId ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase text-red-500/60 mb-1">
                  {selectedModelId.split('/')[0]}
                </div>
                <h3 className="text-xl font-bold text-zinc-100">
                  {selectedModelId.split('/').pop()}
                </h3>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              This model is not supported by <span className="text-zinc-100 font-bold">{activeProviderLabel || activeProviderId || 'the selected provider'}</span>. 
              Please choose a model that is compatible with your active connection.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setMode('browse')}
              className="border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              Select Compatible Model
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

        {/* OpenRouter Provider Routing Configuration */}
        {activeProviderId === 'openrouter' && (
          <div className="mt-6">
            <ProviderRoutingConfig
              config={providerRoutingConfig}
              onChange={handleProviderRoutingChange}
              disabled={updateAiConfig.isPending}
              supportedProviders={currentModel?.default_order}
              currentProviderSlug={currentModel?.endpoint?.provider_slug}
              allProviderSlugs={models.map(m => m.endpoint?.provider_slug).filter(Boolean) as string[]}
            />
          </div>
        )}

        {/* Recent Models */}
        <RecentModelsGrid 
          onSelect={handleSelectModel}
          currentSlug={selectedModelId ?? null}
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

        {(activeProviderId === 'openrouter' || !activeProviderId) && (
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
        )}
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
            selectedSlug={selectedModelId ?? null}
            onSelect={handleSelectModel}
            isMobile={isMobile}
          />
        )}
      </div>
    </div>
  );
}
