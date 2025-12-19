import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { openRouterModels, aiProviders, type OpenRouterModel } from '../../../api/client';
import { queryKeys } from '../../../lib/queryClient';
import { addToRecentModels } from '../QuickActionsBar';

export interface UseModelsTabProps {
  activeProviderId?: string | null;
}

export function useModelsTab({ activeProviderId }: UseModelsTabProps) {
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
  const cleanModelId = useCallback((id: string): string => {
    return id
      .toLowerCase()
      .replace(/[-_]?20\d{6}/g, '')
      .replace(/\d{6,}/g, '')
      .replace(/[-_.]/g, '')
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

  return {
    mode,
    setMode,
    search,
    setSearch,
    providerFilter,
    setProviderFilter,
    showFreeOnly,
    setShowFreeOnly,
    selectedModelSlug,
    models,
    isLoading,
    isFetching,
    filteredModels,
    currentModel,
    handleSelectModel,
    refetchOpenRouter,
  };
}

