export type OpenAIEncodingName = 'cl100k_base' | 'o200k_base';

type TiktokenLike = {
  encode: (text: string) => Uint32Array;
};

type TiktokenEncoderData = {
  bpe_ranks: string;
  special_tokens: Record<string, number>;
  pat_str: string;
};

const tiktokenCache: Partial<Record<OpenAIEncodingName, TiktokenLike>> = {};
const tiktokenLoaders: Partial<Record<OpenAIEncodingName, Promise<TiktokenLike>>> = {};

let tiktokenWasmInitPromise: Promise<void> | null = null;

async function ensureTiktokenWasmInitialized(): Promise<void> {
  if (tiktokenWasmInitPromise) return tiktokenWasmInitPromise;

  tiktokenWasmInitPromise = (async () => {
    const [{ init }, wasmInitMod] = await Promise.all([
      import('@dqbd/tiktoken/lite/init'),
      import('@dqbd/tiktoken/lite/tiktoken_bg.wasm?init'),
    ]);

    const initWasm = (wasmInitMod as unknown as {
      default: (imports: WebAssembly.Imports) => Promise<WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource>;
    }).default;

    await init((imports) => initWasm(imports));
  })();

  return tiktokenWasmInitPromise;
}

export async function getTiktoken(encoding: OpenAIEncodingName): Promise<TiktokenLike> {
  const cached = tiktokenCache[encoding];
  if (cached) return cached;

  const existingLoader = tiktokenLoaders[encoding];
  if (existingLoader) return existingLoader;

  const loader = (async () => {
    await ensureTiktokenWasmInitialized();

    const [{ Tiktoken }, encoderMod] = await Promise.all([
      import('@dqbd/tiktoken/lite/init'),
      encoding === 'o200k_base'
        ? import('@dqbd/tiktoken/encoders/o200k_base')
        : import('@dqbd/tiktoken/encoders/cl100k_base'),
    ]);

    const encoder = (encoderMod as unknown as { default: TiktokenEncoderData }).default;
    const enc = new Tiktoken(encoder.bpe_ranks, encoder.special_tokens, encoder.pat_str) as unknown as TiktokenLike;
    tiktokenCache[encoding] = enc;
    return enc;
  })();

  tiktokenLoaders[encoding] = loader;
  return loader;
}

export async function countOpenAiTokens(text: string, encoding: OpenAIEncodingName = 'cl100k_base'): Promise<number> {
  const enc = await getTiktoken(encoding);
  return enc.encode(text ?? '').length;
}






