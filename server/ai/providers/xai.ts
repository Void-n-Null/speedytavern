import { z } from 'zod';
import { createXai } from '@ai-sdk/xai';
import type { AiProviderDefinition } from '../providerSchema';

export const xaiProvider: AiProviderDefinition = {
  id: 'xai',
  label: 'xAI (Grok)',
  ui: {
    logoUrl: '/provider/xai.svg',
    accentColor: '#000000',
    theme: 'zinc',
    description: 'The Grok family of models from xAI, designed for real-time information and reasoning.',
    defaultModelId: 'grok-beta',
  },
  configSchema: z.object({
    defaultModelId: z.string().min(1).default('grok-beta'),
    baseURL: z.string().url().optional(), // Default: https://api.x.ai/v1
  }),
  authStrategies: [
    {
      id: 'apiKey',
      type: 'apiKey',
      label: 'API Key',
      secretSchema: z.object({
        apiKey: z.string().min(1),
      }),
      requiredSecretKeys: ['apiKey'],
    },
  ],
  createClient: (secrets, config) => {
    return createXai({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
    });
  },
  validate: async (secrets, config) => {
    const baseURL = config.baseURL ?? 'https://api.x.ai/v1';
    const res = await fetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${secrets.apiKey}`,
      },
    });
    if (!res.ok) {
      throw new Error(`xAI validation failed: ${res.status} ${await res.text()}`);
    }
  },
  listModels: async (secrets) => {
    if (!secrets.apiKey) return [];

    try {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${secrets.apiKey}`,
        },
      });

      if (!res.ok) {
        console.error(`[xai] Failed to fetch models: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json() as { models: Array<{ id: string }> };
      // xAI returns { models: [...] } instead of { data: [...] } in some versions, 
      // but their API docs say { data: [...] } for OpenAI compatibility.
      // Let's handle both just in case.
      const models = (data as any).data || (data as any).models || [];
      
      return models.map((m: any) => ({
        id: m.id,
        label: m.id,
      }));
    } catch (e) {
      console.error(`[xai] Error fetching models:`, e);
      return [];
    }
  },
};

