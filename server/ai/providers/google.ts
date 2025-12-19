import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { AiProviderDefinition } from '../providerSchema';

export const googleProvider: AiProviderDefinition = {
  id: 'google',
  label: 'Google Gemini',
  ui: {
    logoUrl: '/provider/google.svg',
    accentColor: '#4285F4',
    theme: 'blue',
    description: 'Powerful multimodal models from Google, including Gemini 1.5 Pro and Flash.',
    defaultModelId: 'gemini-1.5-flash',
  },
  configSchema: z.object({
    defaultModelId: z.string().min(1).default('gemini-1.5-flash'),
    baseURL: z.string().url().optional(), // Vertex AI or custom proxies
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
    return createGoogleGenerativeAI({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
    });
  },
  validate: async (secrets, config) => {
    // Google uses a different validation URL format: passing key as query param for simple model list
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secrets.apiKey}`);
    if (!res.ok) {
      throw new Error(`Google validation failed: ${res.status} ${await res.text()}`);
    }
  },
  listModels: async (secrets) => {
    if (!secrets.apiKey) return [];

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${secrets.apiKey}`);
      if (!res.ok) {
        console.error(`[google] Failed to fetch models: ${res.status}`);
        return [];
      }

      const data = await res.json() as { models: Array<{ name: string; displayName: string }> };
      // Names come back as "models/gemini-1.5-flash", we need to strip the prefix
      return data.models
        .filter(m => m.name.startsWith('models/'))
        .map((m) => ({
          id: m.name.replace('models/', ''),
          label: m.displayName || m.name,
        }));
    } catch (e) {
      console.error(`[google] Error fetching models:`, e);
      return [];
    }
  },
};

