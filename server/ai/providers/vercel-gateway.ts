import { z } from 'zod';
import { createGateway } from 'ai';
import type { AiProviderDefinition } from '../providerSchema';

export const vercelGatewayProvider: AiProviderDefinition = {
  id: 'vercel-gateway',
  label: 'Vercel AI Gateway',
  ui: {
    logoUrl: '/provider/vercel.svg',
    accentColor: '#000000',
    theme: 'zinc',
    description: 'Managed AI Gateway by Vercel. Access hundreds of models through a single API.',
    defaultModelId: 'openai/gpt-4o-mini',
  },
  configSchema: z.object({
    baseURL: z.string().url().optional().describe('Optional custom gateway URL'),
    defaultModelId: z.string().min(1).default('openai/gpt-4o-mini'),
  }),
  authStrategies: [
    {
      id: 'apiKey',
      type: 'apiKey',
      label: 'Gateway API Key',
      secretSchema: z.object({
        apiKey: z.string().min(1),
      }),
      requiredSecretKeys: ['apiKey'],
    },
  ],
  createClient: (secrets, config) => {
    return createGateway({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
    });
  },
  validate: async (secrets, config) => {
    const gw = createGateway({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
    });
    // Use getCredits as a lightweight validation check
    await gw.getCredits();
  },
  listModels: async (secrets, config) => {
    if (!secrets.apiKey) return [];

    const gw = createGateway({
      apiKey: secrets.apiKey,
      baseURL: config?.baseURL,
    });

    try {
      const { models } = await gw.getAvailableModels();
      return models.map((m) => ({
        id: m.id,
        label: m.name || m.id,
      }));
    } catch (err) {
      console.error(`[vercel-gateway] Error fetching models:`, err);
      return [];
    }
  },
};

