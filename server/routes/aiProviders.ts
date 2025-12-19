import { Hono } from 'hono';
import { z } from 'zod';
import { aiProviders, getProviderOrThrow } from '../ai/registry';
import { getProviderConfig, setProviderConfig } from '../ai/config/store';
import { getProviderSecret, hasProviderSecret, setProviderSecret } from '../ai/secrets/store';
import { connectProvider, disconnectProvider } from '../ai/connections/manager';
import { getProviderConnection } from '../ai/connections/store';
import { finishOpenRouterPkce, getPkceReturnUrl, startOpenRouterPkce } from '../ai/pkce/openrouter';

export const aiProviderRoutes = new Hono();

// List providers + current config presence (but never reveal secrets).
aiProviderRoutes.get('/', (c) => {
  const providers = aiProviders.map((p) => {
    const storedConfig = getProviderConfig(p.id);
    const parsedConfig = p.configSchema.safeParse(storedConfig ?? {});
    const connection = getProviderConnection(p.id);

    const strategies = p.authStrategies.map((s) => {
      const presentKeys = s.requiredSecretKeys.filter((k) => hasProviderSecret(p.id, s.id, k));
      return {
        id: s.id,
        type: s.type,
        label: s.label,
        configured: presentKeys.length === s.requiredSecretKeys.length,
        presentKeys,
        requiredKeys: s.requiredSecretKeys,
      };
    });

    return {
      id: p.id,
      label: p.label,
      config: parsedConfig.success ? parsedConfig.data : null,
      configValid: parsedConfig.success,
      authStrategies: strategies,
      connection: connection ?? { provider_id: p.id, auth_strategy_id: null, status: 'disconnected', last_validated_at: null, last_error: null, updated_at: 0 },
    };
  });

  return c.json({ providers });
});

// Set non-secret config.
aiProviderRoutes.put('/:providerId/config', async (c) => {
  const providerId = c.req.param('providerId');
  const provider = getProviderOrThrow(providerId);

  const body = await c.req.json<unknown>();
  const parsed = provider.configSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid config', issues: parsed.error.issues }, 400);
  }

  setProviderConfig(providerId, parsed.data);
  return c.json({ success: true });
});

// Set secrets for an auth strategy (stored encrypted; never returned).
aiProviderRoutes.put('/:providerId/secrets/:authStrategyId', async (c) => {
  const { providerId, authStrategyId } = c.req.param();
  const provider = getProviderOrThrow(providerId);
  const strategy = provider.authStrategies.find((s) => s.id === authStrategyId);
  if (!strategy) return c.json({ error: 'Unknown auth strategy' }, 404);

  const body = await c.req.json<unknown>();
  const parsed = (strategy.secretSchema as z.ZodTypeAny).safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid secret payload', issues: parsed.error.issues }, 400);
  }

  // Store each field as its own encrypted secret entry.
  // (This keeps schema-driven extensibility: multiple keys per provider later.)
  const data = parsed.data as Record<string, unknown>;
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== 'string') {
      return c.json({ error: `Secret field '${k}' must be a string` }, 400);
    }
    setProviderSecret(providerId, authStrategyId, k, v);
  }

  return c.json({ success: true });
});

// Explicitly connect (validate credentials and cache client instance).
aiProviderRoutes.post('/:providerId/connect', async (c) => {
  const providerId = c.req.param('providerId');
  getProviderOrThrow(providerId);

  const body = await c.req.json<{ authStrategyId: string }>().catch(() => ({ authStrategyId: 'apiKey' }));
  const authStrategyId = body.authStrategyId || 'apiKey';

  try {
    await connectProvider(providerId, authStrategyId);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

aiProviderRoutes.post('/:providerId/disconnect', (c) => {
  const providerId = c.req.param('providerId');
  getProviderOrThrow(providerId);
  disconnectProvider(providerId, 'manual disconnect');
  return c.json({ success: true });
});

aiProviderRoutes.get('/:providerId/models', async (c) => {
  const providerId = c.req.param('providerId');
  const provider = getProviderOrThrow(providerId);

  if (!provider.listModels) {
    return c.json({ models: [] });
  }

  // Get connection to find the active auth strategy
  const connection = getProviderConnection(providerId);
  const authStrategyId = connection?.auth_strategy_id || 'apiKey';

  // Gather secrets for the auth strategy
  const strategy = provider.authStrategies.find((s) => s.id === authStrategyId);
  const secrets: Record<string, string> = {};
  
  if (strategy) {
    for (const key of strategy.requiredSecretKeys) {
      const value = getProviderSecret(providerId, authStrategyId, key);
      if (value) {
        secrets[key] = value;
      }
    }
  }

  try {
    const models = await provider.listModels(secrets);
    return c.json({ models });
  } catch (e) {
    console.error(`[aiProviders] Error fetching models for ${providerId}:`, e);
    return c.json({ models: [] }); // Return empty on error, don't fail
  }
});

// ===== OpenRouter PKCE =====
// Starts OAuth PKCE flow and returns an authUrl to redirect the browser to.
aiProviderRoutes.post('/openrouter/pkce/start', async (c) => {
  // Return URL is where we send the user back after the callback finishes.
  const body = await c.req.json<{ returnUrl?: string }>().catch(() => ({}));
  const origin = c.req.header('origin') || 'http://localhost:5173';
  const returnUrl = body.returnUrl || origin;

  const callbackUrl = 'http://localhost:3001/api/ai/providers/openrouter/pkce/callback';
  const { authUrl, state } = startOpenRouterPkce({ callbackUrl, returnUrl });
  return c.json({ authUrl, state });
});

// Callback that OpenRouter redirects to with ?code=...
aiProviderRoutes.get('/openrouter/pkce/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) {
    const returnUrl = state ? getPkceReturnUrl(state) : 'http://localhost:5173';
    return c.redirect(`${returnUrl}?pkce=error&provider=openrouter&reason=missing_code_or_state`);
  }

  const result = await finishOpenRouterPkce(code, state);
  const returnUrl = result.ok ? getPkceReturnUrl(state) : result.returnUrl;

  if (result.ok) {
    return c.redirect(`${returnUrl}?pkce=success&provider=openrouter`);
  }

  return c.redirect(`${returnUrl}?pkce=error&provider=openrouter&reason=${encodeURIComponent(result.error)}`);
});

