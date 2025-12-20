import { QueryClient } from '@tanstack/react-query';
import { type OpenRouterModel, aiProviders, openRouterModels } from '../api/ai';
import { queryKeys } from '../lib/queryClient';

/**
 * Clean model ID for fuzzy matching
 */
export const cleanModelId = (id: string): string => {
  return id
    .toLowerCase()
    .replace(/[-_]?20\d{6}/g, '') // remove dates like 20240620
    .replace(/\d{6,}/g, '')      // remove long numbers
    .replace(/[-_.]/g, '')       // remove separators
    .trim();
};

/**
 * Find a matching model in a provider's list for a given OpenRouter model slug
 */
export function findProviderModelMatch(
  openRouterSlug: string,
  providerId: string,
  providerModels: Array<{ id: string; label?: string }>
): string | null {
  if (providerId === 'openrouter') return openRouterSlug;

  // If the slug already looks like it belongs to this provider (e.g. "anthropic/claude-3"), 
  // try to find the specific provider ID for it.
  const isDirectMatch = openRouterSlug.startsWith(`${providerId}/`);
  const modelPart = isDirectMatch ? openRouterSlug.slice(providerId.length + 1) : openRouterSlug;
  const cleanedTarget = cleanModelId(modelPart.split('/').pop() || modelPart);

  // 1. Try exact match with provider model ID
  const exactMatch = providerModels.find(pm => pm.id === modelPart || pm.id === openRouterSlug);
  if (exactMatch) return exactMatch.id;

  // 2. Try fuzzy match using clean IDs
  for (const pm of providerModels) {
    if (cleanModelId(pm.id) === cleanedTarget) {
      return pm.id;
    }
  }

  return null;
}

/**
 * Find a matching OpenRouter slug for a provider-specific model ID
 */
export function findOpenRouterModelMatch(
  providerModelId: string,
  providerId: string,
  allOpenRouterModels: OpenRouterModel[]
): string | null {
  const cleanedTarget = cleanModelId(providerModelId);

  // Try to find matching model in OpenRouter catalog
  const match = allOpenRouterModels.find(om => {
    // Exact matches
    if (om.slug === providerModelId) return true;
    if (om.slug === `${providerId}/${providerModelId}`) return true;
    if (om.slug.endsWith(`/${providerModelId}`)) return true;
    
    // Fuzzy match
    const omModelPart = om.slug.split('/').pop() || om.slug;
    const cleanedOmId = cleanModelId(omModelPart);
    return cleanedOmId === cleanedTarget;
  });

  return match?.slug || null;
}

/**
 * Resolve a universal model ID (usually OR slug) to a provider-specific model ID.
 */
export async function resolveModelForProvider(
  queryClient: QueryClient,
  targetProviderId: string,
  universalModelId: string | null | undefined,
  currentProviderId?: string
): Promise<string | null> {
  if (!universalModelId) return null;
  if (targetProviderId === 'openrouter') {
    if (!currentProviderId || currentProviderId === 'openrouter') return universalModelId;
    
    const orModels = await queryClient.ensureQueryData({
      queryKey: queryKeys.openRouterModels.list(),
      queryFn: () => openRouterModels.list().then(r => r.models),
    });
    
    const result = findOpenRouterModelMatch(universalModelId, currentProviderId, orModels);
    
    return result;
  }

  try {
    const pModelsData = await queryClient.ensureQueryData({
      queryKey: ['aiProviders', 'models', targetProviderId],
      queryFn: () => aiProviders.listModels(targetProviderId).then(r => r.models),
    });
    
    const result = findProviderModelMatch(universalModelId, targetProviderId, pModelsData);

    return result;
  } catch (e) {
    console.warn(`Failed to resolve model for ${targetProviderId}:`, e);
    return null;
  }
}

