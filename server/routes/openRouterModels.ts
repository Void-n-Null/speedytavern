import { Hono } from 'hono';

export const openRouterModelsRoutes = new Hono();

// Types for the OpenRouter models response
export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  image: string;
  request: string;
}

export interface OpenRouterModelEndpoint {
  id: string;
  name: string;
  context_length: number;
  provider_name: string;
  provider_display_name: string;
  pricing: OpenRouterModelPricing;
  is_free: boolean;
  supports_reasoning: boolean;
  supports_multipart: boolean;
  max_completion_tokens: number | null;
}

export interface OpenRouterModel {
  slug: string;
  name: string;
  short_name: string;
  author: string;
  description: string;
  context_length: number;
  input_modalities: string[];
  output_modalities: string[];
  group: string;
  supports_reasoning: boolean;
  hidden: boolean;
  permaslug: string;
  endpoint?: OpenRouterModelEndpoint;
}

export interface OpenRouterModelsResponse {
  data: {
    models: OpenRouterModel[];
  };
}

// In-memory cache with TTL
let modelsCache: {
  data: OpenRouterModel[] | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Fetch all models from OpenRouter
openRouterModelsRoutes.get('/', async (c) => {
  const now = Date.now();
  
  // Return cached data if fresh
  if (modelsCache.data && now - modelsCache.timestamp < CACHE_TTL_MS) {
    return c.json({ models: modelsCache.data, cached: true });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/frontend/models/find', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TavernStudio/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const json = await response.json() as OpenRouterModelsResponse;
    
    // Extract and normalize the models
    const models: OpenRouterModel[] = (json.data?.models || [])
      .filter((m: OpenRouterModel) => !m.hidden)
      .map((m: OpenRouterModel) => ({
        slug: m.slug,
        name: m.name,
        short_name: m.short_name,
        author: m.author,
        description: m.description,
        context_length: m.context_length,
        input_modalities: m.input_modalities || ['text'],
        output_modalities: m.output_modalities || ['text'],
        group: m.group || 'Other',
        supports_reasoning: m.supports_reasoning || false,
        hidden: m.hidden,
        permaslug: m.permaslug,
        endpoint: m.endpoint ? {
          id: m.endpoint.id,
          name: m.endpoint.name,
          context_length: m.endpoint.context_length,
          provider_name: m.endpoint.provider_name,
          provider_display_name: m.endpoint.provider_display_name,
          pricing: m.endpoint.pricing,
          is_free: m.endpoint.is_free,
          supports_reasoning: m.endpoint.supports_reasoning,
          supports_multipart: m.endpoint.supports_multipart,
          max_completion_tokens: m.endpoint.max_completion_tokens,
        } : undefined,
      }));

    // Update cache
    modelsCache = { data: models, timestamp: now };

    return c.json({ models, cached: false });
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    
    // Return stale cache if available
    if (modelsCache.data) {
      return c.json({ models: modelsCache.data, cached: true, stale: true });
    }
    
    return c.json({ error: 'Failed to fetch models' }, 500);
  }
});

// Force refresh the cache
openRouterModelsRoutes.post('/refresh', async (c) => {
  modelsCache = { data: null, timestamp: 0 };
  
  // Trigger a fresh fetch
  const response = await fetch('https://openrouter.ai/api/frontend/models/find', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'TavernStudio/1.0',
    },
  });

  if (!response.ok) {
    return c.json({ error: 'Failed to refresh models' }, 500);
  }

  const json = await response.json() as OpenRouterModelsResponse;
  const models = (json.data?.models || []).filter((m: OpenRouterModel) => !m.hidden);
  
  modelsCache = { data: models, timestamp: Date.now() };
  
  return c.json({ success: true, count: models.length });
});

