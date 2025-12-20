import { z } from 'zod';

export type AuthStrategyType = 'apiKey' | 'pkce';
export type ProviderTheme = 'light' | 'dark' | 'zinc' | 'violet' | 'blue' | 'orange' | 'cyan' | 'rose' | 'indigo';

/**
 * Schema-driven description of how a provider is authenticated.
 */
export type AuthStrategyDefinition = {
  id: string; // e.g. "apiKey", "pkce"
  type: AuthStrategyType;
  label: string;
  /**
   * Secret payload schema (encrypted and stored).
   * Example: { apiKey: string }
   */
  secretSchema: z.ZodTypeAny;
  /**
   * List of secret keys inside secretSchema that must exist for the strategy
   * to be considered "configured".
   */
  requiredSecretKeys: string[];
};

/**
 * Metadata for rendering the provider in the UI.
 */
export type AiProviderUiMetadata = {
  logoUrl?: string; // Relative to public/
  accentColor?: string; // Hex code or Tailwind color class
  theme?: ProviderTheme;
  description?: string;
  defaultModelId?: string; // Sane default model to use when first configuring
};

export type AiProviderDefinition = {
  id: string; // "openrouter" | "openai" | "anthropic" | ...
  label: string;
  /**
   * Non-secret config: safe to return to the client.
   * Example: defaultModelId, baseURL, request options...
   */
  configSchema: z.ZodTypeAny;

  /**
   * Visual and descriptive metadata for the UI.
   */
  ui?: AiProviderUiMetadata;

  /**
   * How this provider can be authenticated.
   * Most providers will have one. OpenRouter can support both apiKey and pkce.
   */
  authStrategies: AuthStrategyDefinition[];

  /**
   * List models available for this provider.
   * Can be static or dynamic (calling the provider API if connected).
   */
  listModels?: (secrets: Record<string, string>, config: any) => Promise<{ id: string; label: string }[]>;

  /**
   * Factory for the AI SDK provider instance.
   * This is called when connecting to store the client in the server cache.
   */
  createClient: (secrets: Record<string, string>, config: any) => any;

  /**
   * Optional validation logic. If it throws, the connection is considered failed.
   */
  validate?: (secrets: Record<string, string>, config: any) => Promise<void>;
};

export type ProviderId = AiProviderDefinition['id'];

