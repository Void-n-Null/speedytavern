import { getProviderConfig } from '../config/store';
import { getProviderSecret } from '../secrets/store';
import { getProviderOrThrow } from '../registry';
import { getProviderConnection, markDisconnected, upsertProviderConnection } from './store';

export type ConnectedClient = {
  providerId: string;
  client: any; // The AI SDK provider instance
};

const clientCache = new Map<string, ConnectedClient>();

function classifyAuthError(err: any): 'error_auth' | 'error_other' {
  const msg = String(err).toLowerCase();
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'error_auth';
  }
  return 'error_other';
}

/**
 * Connect (validate credentials) and cache a provider client instance.
 * This does NOT start any model streams; it just confirms auth works.
 */
export async function connectProvider(providerId: string, authStrategyId: string | null): Promise<void> {
  const def = getProviderOrThrow(providerId);

  const secrets: Record<string, string> = {};

  // Providers can optionally have zero auth strategies (no-auth).
  let effectiveAuthStrategyId: string | null = authStrategyId;
  if (def.authStrategies.length > 0) {
    const desiredId = authStrategyId ?? def.authStrategies[0]?.id ?? null;
    if (!desiredId) throw new Error(`Missing auth strategy id for provider: ${providerId}`);

    const strategy = def.authStrategies.find((s) => s.id === desiredId);
    if (!strategy) throw new Error(`Unknown auth strategy: ${desiredId}`);
    effectiveAuthStrategyId = desiredId;

    // Ensure required secrets exist.
    for (const key of strategy.requiredSecretKeys) {
      const val = getProviderSecret(providerId, desiredId, key);
      if (!val) throw new Error(`Missing ${key} secret for this strategy`);
      secrets[key] = val;
    }
  } else {
    effectiveAuthStrategyId = null;
  }

  // Parse config to get base URLs / headers if needed.
  const rawConfig = getProviderConfig(providerId) ?? {};
  const parsedConfig = def.configSchema.safeParse(rawConfig);
  const config = parsedConfig.success ? parsedConfig.data : {};

  try {
    // 1. Validate if the provider has a validation method
    if (def.validate) {
      await def.validate(secrets, config);
    }

    // 2. Create and cache the client
    const client = def.createClient(secrets, config);
    clientCache.set(providerId, { providerId, client });

    // 3. Update connection status
    upsertProviderConnection(providerId, {
      auth_strategy_id: effectiveAuthStrategyId,
      status: 'connected',
      last_error: null,
      last_validated_at: Date.now(),
    });
  } catch (e) {
    const status = classifyAuthError(e);
    const last_error = e instanceof Error ? e.message : String(e);
    
    upsertProviderConnection(providerId, {
      auth_strategy_id: effectiveAuthStrategyId,
      status,
      last_error: last_error.slice(0, 500),
      last_validated_at: null,
    });
    
    throw e;
  }
}

export function disconnectProvider(providerId: string, reason: string | null = null): void {
  clientCache.delete(providerId);
  markDisconnected(providerId, reason);
}

export function getConnectedClient(providerId: string): ConnectedClient | null {
  return clientCache.get(providerId) ?? null;
}

export function getConnectionStatus(providerId: string) {
  return getProviderConnection(providerId);
}








