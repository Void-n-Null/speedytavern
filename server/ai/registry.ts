import { readdirSync } from 'fs';
import { join } from 'path';
import type { AiProviderDefinition } from './providerSchema';

/**
 * Auto-discover all providers in the ./providers directory.
 * This allows adding a new provider by just creating a single file.
 */
const providersDir = join(import.meta.dir, 'providers');
const files = readdirSync(providersDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

const discoveredProviders: AiProviderDefinition[] = [];

for (const file of files) {
  const mod = await import(`./providers/${file}`);
  // Find the exported provider definition object
  const provider = Object.values(mod).find(
    (v) => typeof v === 'object' && v !== null && 'id' in v && 'label' in v
  ) as AiProviderDefinition;
  
  if (provider) {
    discoveredProviders.push(provider);
  }
}

export const aiProviders: readonly AiProviderDefinition[] = discoveredProviders;

export function getProviderOrThrow(providerId: string): AiProviderDefinition {
  const found = aiProviders.find((p) => p.id === providerId);
  if (!found) throw new Error(`Unknown provider: ${providerId}`);
  return found;
}

