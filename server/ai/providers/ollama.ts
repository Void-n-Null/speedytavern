import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import type { AiProviderDefinition } from '../providerSchema';

function normalizeBaseUrl(input: string | undefined): string {
  const raw = (input ?? 'http://localhost:11434/v1').trim();
  return raw.replace(/\/+$/, '');
}

export const ollamaProvider: AiProviderDefinition = {
  id: 'ollama',
  label: 'Ollama',
  ui: {
    logoUrl: '/provider/ollama.svg',
    accentColor: '#ffffff',
    theme: 'zinc',
    description: 'Local models via Ollama (OpenAI-compatible API). No API key required.',
    defaultModelId: 'llama3.2',
  },
  configSchema: z.object({
    baseURL: z.string().url().default('http://localhost:11434/v1'),
    defaultModelId: z.string().min(1).default('llama3.2'),
  }),
  // Ollama does not require auth; connection is considered valid if /v1/models responds.
  authStrategies: [],
  createClient: (_secrets, config) => {
    const baseURL = normalizeBaseUrl(config?.baseURL);
    return createOpenAI({
      // AI SDK OpenAI client expects an apiKey; Ollama ignores Authorization.
      apiKey: 'ollama',
      baseURL,
    });
  },
  validate: async (_secrets, config) => {
    const baseURL = normalizeBaseUrl(config?.baseURL);
    const res = await fetch(`${baseURL}/models`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Ollama validation failed: ${res.status} ${await res.text()}`);
    }
  },
  listModels: async (_secrets, config) => {
    const baseURL = normalizeBaseUrl(config?.baseURL);
    const res = await fetch(`${baseURL}/models`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.error(`[ollama] Failed to fetch models: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = (await res.json()) as { data?: Array<{ id: string }> };
    const models = Array.isArray(data.data) ? data.data : [];
    return models.map((m) => ({ id: m.id, label: m.id }));
  },
};


