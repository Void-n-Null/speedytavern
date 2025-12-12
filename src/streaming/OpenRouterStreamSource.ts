import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

export type OpenRouterStreamSourceOptions = {
  apiKey: string;
  modelId: string;
  /**
   * Optional OpenRouter app identity headers.
   * See: https://openrouter.ai/docs#requests
   */
  appName?: string;
  appUrl?: string;
};

export type OpenRouterStreamRequest = {
  prompt: string;
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
};

/**
 * Minimal OpenRouter-backed text stream source for DEV usage.
 *
 * This runs in the browser and requires an API key; do NOT enable in production UI.
 */
export class OpenRouterStreamSource {
  private apiKey: string;
  private modelId: string;
  private appName?: string;
  private appUrl?: string;

  constructor(opts: OpenRouterStreamSourceOptions) {
    this.apiKey = opts.apiKey;
    this.modelId = opts.modelId;
    this.appName = opts.appName;
    this.appUrl = opts.appUrl;
  }

  async stream(req: OpenRouterStreamRequest): Promise<void> {
    if (!this.apiKey) throw new Error('Missing OpenRouter API key');
    if (!this.modelId) throw new Error('Missing OpenRouter model id');

    const openrouter = createOpenRouter({
      apiKey: this.apiKey,
      headers: {
        ...(this.appName ? { 'X-Title': this.appName } : null),
        ...(this.appUrl ? { 'HTTP-Referer': this.appUrl } : null),
      },
    });

    const result = await streamText({
      model: openrouter.chat(this.modelId),
      prompt: req.prompt,
      abortSignal: req.signal,
    });

    for await (const delta of result.textStream) {
      if (delta) req.onDelta(delta);
    }
  }
}

