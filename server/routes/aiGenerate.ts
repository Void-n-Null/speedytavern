/**
 * AI Generation Route
 * 
 * Handles streaming AI generation for chat messages.
 * Uses the AI SDK to stream responses from the configured provider.
 */

import { Hono } from 'hono';
import { streamText, type ModelMessage } from 'ai';
import { getConnectedClient } from '../ai/connections/manager';
import { getProviderOrThrow } from '../ai/registry';
import { getProviderSecret } from '../ai/secrets/store';
import { getProviderConfig } from '../ai/config/store';
import { getProviderConnection } from '../ai/connections/store';
import { logAiRequest } from '../ai/requestLogger';
import type { OpenRouterModel } from './openRouterModels';

export const aiGenerateRoutes = new Hono();

// In-memory cache reference for model pricing (shared with openRouterModels.ts via import)
let modelPricingCache: Map<string, { inputPrice: number; outputPrice: number }> | null = null;
let modelPricingCacheTime = 0;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse OpenRouter pricing string to number (price per token)
 * Format can be "$0.000003" or "0.000003"
 */
function parsePriceString(price: string): number {
  const cleaned = price.replace('$', '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * Fetch and cache model pricing from OpenRouter
 */
async function getModelPricing(): Promise<Map<string, { inputPrice: number; outputPrice: number }>> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (modelPricingCache && now - modelPricingCacheTime < PRICING_CACHE_TTL) {
    return modelPricingCache;
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/frontend/models/find', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TavernStudio/1.0',
      },
    });
    
    if (!response.ok) {
      console.warn('[aiGenerate] Failed to fetch model pricing:', response.status);
      return modelPricingCache ?? new Map();
    }
    
    const json = await response.json() as { data?: { models?: OpenRouterModel[] } };
    const models = json.data?.models ?? [];
    
    const pricingMap = new Map<string, { inputPrice: number; outputPrice: number }>();
    
    for (const model of models) {
      if (model.endpoint?.pricing) {
        pricingMap.set(model.slug, {
          inputPrice: parsePriceString(model.endpoint.pricing.prompt),
          outputPrice: parsePriceString(model.endpoint.pricing.completion),
        });
      }
    }
    
    modelPricingCache = pricingMap;
    modelPricingCacheTime = now;
    
    return pricingMap;
  } catch (error) {
    console.warn('[aiGenerate] Error fetching model pricing:', error);
    return modelPricingCache ?? new Map();
  }
}

interface GenerateRequest {
  providerId: string;
  modelId: string;
  messages: ModelMessage[];
  params?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
  };
}

/**
 * Stream AI generation.
 * 
 * Uses Server-Sent Events (SSE) to stream the response.
 * 
 * Events:
 * - `delta`: Text chunk from the AI
 * - `done`: Generation complete, includes usage stats
 * - `error`: Error occurred during generation
 */
aiGenerateRoutes.post('/stream', async (c) => {
  const startTime = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let status: 'success' | 'error' = 'success';
  let errorMessage: string | null = null;

  try {
    const body = await c.req.json<GenerateRequest>();
    const { providerId, modelId, messages, params } = body;

    if (!providerId || !modelId) {
      return c.json({ error: 'Missing providerId or modelId' }, 400);
    }

    if (!messages || messages.length === 0) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    // Get the provider definition
    const providerDef = getProviderOrThrow(providerId);

    // Check if provider is connected
    const connection = getProviderConnection(providerId);
    if (!connection || connection.status !== 'connected') {
      return c.json({ error: `Provider ${providerId} is not connected` }, 400);
    }

    // Get or create the client
    let client = getConnectedClient(providerId)?.client;
    
    if (!client) {
      // Try to create client from stored secrets
      const authStrategyId = connection.auth_strategy_id || 'apiKey';
      const strategy = providerDef.authStrategies.find(s => s.id === authStrategyId);
      if (!strategy) {
        return c.json({ error: `Unknown auth strategy: ${authStrategyId}` }, 400);
      }

      const secrets: Record<string, string> = {};
      for (const key of strategy.requiredSecretKeys) {
        const val = getProviderSecret(providerId, authStrategyId, key);
        if (!val) {
          return c.json({ error: `Missing ${key} secret` }, 400);
        }
        secrets[key] = val;
      }

      const rawConfig = getProviderConfig(providerId) ?? {};
      const parsedConfig = providerDef.configSchema.safeParse(rawConfig);
      const config = parsedConfig.success ? parsedConfig.data : {};

      client = providerDef.createClient(secrets, config);
    }

    // Build model instance
    // The AI SDK providers return a function that creates model instances
    const model = client(modelId);

    // Fetch model pricing for cost calculation
    const pricingMap = await getModelPricing();
    const pricing = pricingMap.get(modelId);

    // Capture response text for logging
    let responseText = '';
    
    // Build FULL request metadata for logging
    const requestMetadata = {
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      messageCount: messages.length,
      params: params || null,
    };

    // Helper to log the request (called when stream completes or errors)
    const logRequest = (calculatedCost?: number) => {
      logAiRequest({
        providerId,
        modelSlug: modelId,
        inputTokens: inputTokens || undefined,
        outputTokens: outputTokens || undefined,
        inputPricePerToken: pricing?.inputPrice,
        outputPricePerToken: pricing?.outputPrice,
        latencyMs: Date.now() - startTime,
        status,
        errorMessage: errorMessage || undefined,
        metadata: {
          // Flat structure - messages IS the payload
          ...requestMetadata,
          response: responseText || null,
          responseLength: responseText.length,
        },
      });
    };

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamText({
            model,
            messages, // Everything is in messages: system (role: system), history, prefill
            temperature: params?.temperature,
            maxOutputTokens: params?.maxTokens,
            topP: params?.topP,
            topK: params?.topK,
            presencePenalty: params?.presencePenalty,
            frequencyPenalty: params?.frequencyPenalty,
            stopSequences: params?.stopSequences,
          });

          // Stream text deltas
          for await (const delta of result.textStream) {
            if (delta) {
              responseText += delta;
              const event = `event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }
          }

          // Get final usage if available
          const usage = await result.usage;
          inputTokens = usage?.inputTokens ?? 0;
          outputTokens = usage?.outputTokens ?? 0;

          // Calculate cost if we have pricing
          let calculatedCost: number | undefined;
          if (pricing) {
            const inputCost = inputTokens * pricing.inputPrice;
            const outputCost = outputTokens * pricing.outputPrice;
            calculatedCost = inputCost + outputCost;
          }

          // Send completion event
          const doneEvent = `event: done\ndata: ${JSON.stringify({
            usage: {
              promptTokens: inputTokens,
              completionTokens: outputTokens,
              totalTokens: (inputTokens + outputTokens),
            },
            latencyMs: Date.now() - startTime,
            cost: calculatedCost,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
          controller.close();
          
          // Log successful request AFTER stream completes
          logRequest(calculatedCost);

        } catch (err) {
          status = 'error';
          errorMessage = err instanceof Error ? err.message : String(err);
          
          const errorEvent = `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
          
          // Log failed request AFTER error
          logRequest();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // Log failed request
    logAiRequest({
      providerId: 'unknown',
      modelSlug: 'unknown',
      latencyMs: Date.now() - startTime,
      status: 'error',
      errorMessage: errorMsg,
    });

    return c.json({ error: errorMsg }, 500);
  }
});

