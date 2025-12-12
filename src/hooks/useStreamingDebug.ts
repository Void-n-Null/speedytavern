import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStreamingStore } from '../store/streamingStore';
import { useStreaming } from './useStreaming';
import { OpenRouterStreamSource } from '../streaming/OpenRouterStreamSource';

export type StreamingDebugScenarioId = 'markdown' | 'roleplay_long' | 'roleplay_spicy';
export type StreamingDebugChunkMode = 'characters' | 'openai_tokens';
export type OpenAIEncodingName = 'cl100k_base' | 'o200k_base';
export type StreamingDebugSource = 'fake' | 'openrouter';

export interface StreamingDebugScenario {
  id: StreamingDebugScenarioId;
  label: string;
  /** Used for fake-stream mode (we stream this exact string). */
  fakeContent: string;
  /** Used for OpenRouter mode (we send this prompt and stream the model output). */
  defaultPrompt: string;
}

export const STREAMING_DEBUG_SCENARIOS: readonly StreamingDebugScenario[] = [
  {
    id: 'markdown',
    label: 'Markdown example',
    fakeContent:
      '# Streaming Markdown Torture Test\n\n' +
      'This message is designed to stress **streaming markdown rendering** and edge-cases.\n\n' +
      '## Basics\n\n' +
      '- Bold: **bold text**\n' +
      '- Italic: *italic text*\n' +
      '- Inline code: `const x = 1;`\n' +
      '- A link: [example](https://example.com)\n' +
      '- Quotes to highlight: "straight quotes" and “smart quotes”\n\n' +
      '## Lists + nesting\n\n' +
      '1. First item\n' +
      '2. Second item\n' +
      '   - Nested bullet A\n' +
      '   - Nested bullet B with **emphasis** and `inline code`\n\n' +
      '## Blockquote\n\n' +
      '> "We are what we repeatedly do."\n' +
      '>\n' +
      '> - Aristotle-ish (probably)\n\n' +
      '## Fenced code (TS)\n\n' +
      'Note the fence starts *on its own line* (GFM requirement).\n\n' +
      '```ts\n' +
      'type User = { id: string; name: string };\n' +
      '\n' +
      'export function greet(user: User) {\n' +
      '  return `Hello, ${user.name}!`;\n' +
      '}\n' +
      '```\n\n' +
      '## Inline fence normalization\n\n' +
      'Sometimes people type fences inline like this: here we go ```json\n' +
      '{ "ok": true, "note": "this should become a real fence" }\n' +
      '```\n\n' +
      '## Table\n\n' +
      '| column | value |\n' +
      '| --- | --- |\n' +
      '| a | 1 |\n' +
      '| b | 2 |\n\n' +
      '## Ending\n\n' +
      'Streaming should handle unfinished markdown while typing, then settle correctly when complete.\n',
    defaultPrompt:
      'Write a single response that stress-tests streaming markdown rendering. ' +
      'Include: headings, lists with nesting, blockquote, fenced code (TypeScript), a table, and end with a short concluding paragraph. ' +
      'Make it reasonably long.',
  },
  {
    id: 'roleplay_long',
    label: 'Long AI roleplay response',
    fakeContent:
      '*The tavern door groans open as rain and lanternlight spill across the floorboards.*\n\n' +
      '"You made it," I say, lifting my mug in greeting. "I was starting to think the storm would win."\n\n' +
      'The hearth throws warm shadows up the beams, and the room smells like woodsmoke, citrus peel, and something sweet that shouldn’t be allowed to exist in a town this far from the capital.\n\n' +
      '*I slide a seat out for you with the heel of my boot, casual as if I hadn’t been watching the door for the last ten minutes.*\n\n' +
      '"So. Tonight we do this properly." I tap the tabletop twice—our old signal. "No rushed plans. No half-truths. Just the story, start to finish."\n\n' +
      'Outside, thunder walks its slow circles around the valley. Inside, the bard misses a chord and recovers with a grin. Somewhere near the back, someone laughs too loud, and the laugh turns into a cough.\n\n' +
      'I lean closer, voice low enough that only you can hear it.\n\n' +
      '"First: the map." I unroll a narrow strip of parchment between us. The ink is smeared in places where it’s been folded and unfolded, carried too close to heat, handled in too many nervous hands.\n\n' +
      'There’s a river drawn like a silver scar. A hill marked with three short lines. And, in the corner, a symbol—three dots in a triangle—that the guild swears doesn’t exist.\n\n' +
      '"Second: the job." I watch your face while I say it, because your eyes always tell the truth before your mouth catches up. "We’re not stealing a crown. We’re not rescuing a prince. We’re not even breaking into a vault."\n\n' +
      '*I pause just long enough for you to start imagining something worse.*\n\n' +
      '"We’re retrieving a name."\n\n' +
      'That gets the reaction I expect: a blink, then a slow, careful inhale. People don’t like missing names. They make the mind itch. They make the skin feel wrong.\n\n' +
      '"A name from where?" you ask.\n\n' +
      '"From the part of the library they don’t show tourists," I answer. "From the shelves that only open when you speak a password you’ve never learned. From the ledger that was written in ink that refuses to be read… unless you already know what it says."\n\n' +
      '*I spread my hands, palms up, like an apology.*\n\n' +
      '"I didn’t say it was fair. I said it was possible."\n\n' +
      'The waitress arrives—a woman with a scar on her chin and an expression that could deflate a cannonball. She sets down a bowl of stew and a tiny dish of something red that smells like pepper and dare.\n\n' +
      '"On the house," she says, eyes flicking to the map and then away with practiced disinterest. "And if you’re thinking of going up-mountain, don’t. People come back missing pieces."\n\n' +
      '"Pieces of what?" you ask.\n\n' +
      'She shrugs. "Memories. Fingers. Luck. Depends on who they were before they left."\n\n' +
      '*When she’s gone, I exhale like I’ve been holding my breath since you sat down.*\n\n' +
      '"Third," I say, tapping the map again, "the rules."\n\n' +
      '- We don’t split up.\n' +
      '- We don’t bargain with anything that smiles without a mouth.\n' +
      '- We don’t say our true names out loud in the dark.\n\n' +
      'You raise an eyebrow. "You really know how to sell a night out."\n\n' +
      '"I know how to keep you alive," I counter, and my voice comes out sharper than intended. The edge softens when I see your expression. "Sorry. I… promised myself I wouldn’t lose anyone else to that place."\n\n' +
      'For a heartbeat, the noise of the tavern recedes. The rain becomes a hush. The fire becomes a heartbeat.\n\n' +
      '*I reach for your hand—hesitate—then take it anyway, rough fingers warm against yours.*\n\n' +
      '"Listen," I say. "If at any point you want to walk away, we do. No pride. No sunk cost. We go home and let the mountain keep its secrets."\n\n' +
      'You squeeze my hand once, steady.\n\n' +
      '"Alright," you say. "Tell me what you haven’t told me yet."\n\n' +
      '*I swallow, because this is the part that still tastes like fear.*\n\n' +
      '"The name," I admit, "is yours."\n\n' +
      'And just like that, the story begins in earnest.\n',
    defaultPrompt:
      'Write a long, vivid roleplay-style response set in a tavern during a storm. ' +
      'Use italics for actions, include dialogue, and build tension. Keep it PG-13.',
  },
  {
    id: 'roleplay_spicy',
    label: 'Spicy AI roleplay response (PG-13)',
    fakeContent:
      '*The tavern is loud enough to hide secrets, but not loud enough to hide the way you look at me when you think I’m not watching.*\n\n' +
      '"You’re trouble," I murmur, leaning in just close enough that my breath warms your ear.\n\n' +
      '*My gloved fingers hook lightly at your sleeve—barely a touch, a question more than a claim—and I tilt my head like I’m listening to the music. But really, I’m listening to you.*\n\n' +
      '"Say the word," I add, voice low and playful, "and I’ll behave."\n\n' +
      'The candlelight makes a soft gold of the tabletop. It makes your eyes look like a dare I’m not sure I should accept. Someone at the bar tells a joke; the room laughs; you don’t. You just hold my gaze.\n\n' +
      '*I smile—slow, fond, entirely unfair—and tap the rim of your cup with mine.*\n\n' +
      '"Then let’s make a bargain," I say. "One dance. One drink. And if you still want to walk away after… I’ll let you."\n\n' +
      'I don’t move back. I don’t move closer either. I give you the space to choose, and I make it obvious I’m hoping you don’t.\n\n' +
      '"But if you don’t walk away," I continue, softer now, "I’m going to spend the rest of the night proving exactly how much I like the sound of your laugh."\n\n' +
      '*My thumb traces a small, careful circle over your knuckles—nothing more—then stills, waiting.*\n',
    defaultPrompt:
      'Write a flirtatious roleplay-style response (PG-13) set in a tavern. ' +
      'Use italics for actions, keep consent/choice explicit, and keep it suggestive but not explicit.',
  },
] as const;

function chunkByCharacters(text: string, charsPerChunk: number): string[] {
  const chars = Array.from(text);
  const size = Math.max(1, Math.floor(charsPerChunk));
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += size) {
    chunks.push(chars.slice(i, i + size).join(''));
  }
  return chunks;
}

type TiktokenLike = {
  encode: (text: string) => Uint32Array;
  decode: (tokens: Uint32Array) => Uint8Array;
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

    const initWasm = (wasmInitMod as unknown as { default: (imports: WebAssembly.Imports) => Promise<WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource> })
      .default;

    await init((imports) => initWasm(imports));
  })();

  return tiktokenWasmInitPromise;
}

async function getTiktoken(encoding: OpenAIEncodingName): Promise<TiktokenLike> {
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

async function chunkByOpenAITokens(
  text: string,
  encoding: OpenAIEncodingName,
  tokensPerChunk: number
): Promise<string[]> {
  const enc = await getTiktoken(encoding);
  const ids = enc.encode(text);
  const size = Math.max(1, Math.floor(tokensPerChunk));
  const chunks: string[] = [];
  const decoder = new TextDecoder();

  for (let i = 0; i < ids.length; i += size) {
    const bytes = enc.decode(ids.slice(i, i + size));
    const part = decoder.decode(bytes, { stream: true });
    if (part) chunks.push(part);
  }

  const tail = decoder.decode();
  if (tail) chunks.push(tail);

  return chunks;
}

export interface StreamingDebugState {
  // UI
  uiVisible: boolean;
  hideUi: () => void;

  // Streaming state
  isStreaming: boolean;
  isFeeding: boolean;
  tokenizationError: string | null;
  openRouterError: string | null;

  // Settings
  source: StreamingDebugSource;
  setSource: (src: StreamingDebugSource) => void;

  scenarioId: StreamingDebugScenarioId;
  setScenarioId: (id: StreamingDebugScenarioId) => void;

  openRouterApiKey: string;
  setOpenRouterApiKey: (k: string) => void;
  openRouterModelId: string;
  setOpenRouterModelId: (m: string) => void;
  openRouterPrompt: string;
  setOpenRouterPrompt: (p: string) => void;

  chunkMode: StreamingDebugChunkMode;
  setChunkMode: (mode: StreamingDebugChunkMode) => void;

  openAIEncoding: OpenAIEncodingName;
  setOpenAIEncoding: (enc: OpenAIEncodingName) => void;

  delayMs: number;
  setDelayMs: (ms: number) => void;

  charsPerChunk: number;
  setCharsPerChunk: (n: number) => void;

  tokensPerChunk: number;
  setTokensPerChunk: (n: number) => void;

  // Progress
  progressIndex: number;
  progressTotal: number;
  progressUnit: 'chars' | 'tokens' | 'chunks';

  // Actions
  start: () => Promise<void>;
  stopFeeding: () => void;
  finalize: () => Promise<boolean>;
  cancel: () => void;
}

/**
 * Streaming debug harness that can stream canned scenarios either:
 * - **character-by-character**, or
 * - **OpenAI-style tokenization** (tiktoken: cl100k_base / o200k_base)
 */
export function useStreamingDebug(): StreamingDebugState {
  const streaming = useStreaming();

  // Hidden by default; becomes visible on first Start (including keyboard 's').
  const [uiVisible, setUiVisible] = useState(false);

  const [source, setSource] = useState<StreamingDebugSource>(() => {
    try {
      const raw = localStorage.getItem('tavern.streamingDebug.source');
      return raw === 'openrouter' ? 'openrouter' : 'fake';
    } catch {
      return 'fake';
    }
  });

  const [scenarioId, setScenarioId] = useState<StreamingDebugScenarioId>('markdown');
  const [chunkMode, setChunkMode] = useState<StreamingDebugChunkMode>('characters');
  const [openAIEncoding, setOpenAIEncoding] = useState<OpenAIEncodingName>('cl100k_base');

  const [delayMs, setDelayMs] = useState<number>(20);
  const [charsPerChunk, setCharsPerChunk] = useState<number>(1);
  const [tokensPerChunk, setTokensPerChunk] = useState<number>(1);

  const [isFeeding, setIsFeeding] = useState(false);
  const [tokenizationError, setTokenizationError] = useState<string | null>(null);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressUnit, setProgressUnit] = useState<'chars' | 'tokens' | 'chunks'>('chunks');

  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('tavern.openrouter.apiKey') ?? '';
    } catch {
      return '';
    }
  });
  const [openRouterModelId, setOpenRouterModelId] = useState<string>(() => {
    try {
      return localStorage.getItem('tavern.openrouter.modelId') ?? 'openai/gpt-4o-mini';
    } catch {
      return 'openai/gpt-4o-mini';
    }
  });
  const [openRouterPrompt, setOpenRouterPrompt] = useState<string>(() => {
    // Default gets overwritten once scenario is resolved (effect below)
    return '';
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef(0);
  const chunksRef = useRef<string[]>([]);
  const cursorRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const scenario = useMemo(() => {
    const found = STREAMING_DEBUG_SCENARIOS.find((s) => s.id === scenarioId);
    return found ?? STREAMING_DEBUG_SCENARIOS[0];
  }, [scenarioId]);

  // Keep prompt in sync with scenario (unless user has edited it).
  useEffect(() => {
    setOpenRouterPrompt((prev) => prev || scenario.defaultPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Persist debug settings to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem('tavern.streamingDebug.source', source);
    } catch {}
  }, [source]);
  useEffect(() => {
    try {
      localStorage.setItem('tavern.openrouter.apiKey', openRouterApiKey);
    } catch {}
  }, [openRouterApiKey]);
  useEffect(() => {
    try {
      localStorage.setItem('tavern.openrouter.modelId', openRouterModelId);
    } catch {}
  }, [openRouterModelId]);

  const clearIntervalOnly = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopFeeding = useCallback(() => {
    // Abort any pending async chunk build for the current run.
    runIdRef.current += 1;
    clearIntervalOnly();
    abortRef.current?.abort();
    abortRef.current = null;
    setIsFeeding(false);
  }, [clearIntervalOnly]);

  const buildChunks = useCallback(async (): Promise<{ chunks: string[]; unit: 'chars' | 'tokens' | 'chunks' }> => {
    if (chunkMode === 'characters') {
      const chunks = chunkByCharacters(scenario.fakeContent, charsPerChunk);
      return { chunks, unit: 'chunks' };
    }

    const chunks = await chunkByOpenAITokens(scenario.fakeContent, openAIEncoding, tokensPerChunk);
    return { chunks, unit: 'chunks' };
  }, [chunkMode, scenario.fakeContent, charsPerChunk, openAIEncoding, tokensPerChunk]);

  const start = useCallback(async () => {
    setUiVisible(true);

    // New run; also abort any previous in-flight tokenization.
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setTokenizationError(null);
    setOpenRouterError(null);

    // If already streaming, restart cleanly.
    if (useStreamingStore.getState().meta) {
      clearIntervalOnly();
      setIsFeeding(false);
      streaming.cancel();
    }

    const started = streaming.start({ speaker: 'bot' });
    if (!started) return;

    clearIntervalOnly();
    setIsFeeding(true);

    if (source === 'openrouter') {
      try {
        const ac = new AbortController();
        abortRef.current = ac;

        // Progress is basically unbounded; show "deltas".
        setProgressUnit('chunks');
        setProgressIndex(0);
        setProgressTotal(0);

        const src = new OpenRouterStreamSource({
          apiKey: openRouterApiKey,
          modelId: openRouterModelId,
          appName: 'TavernStudio (DEV)',
          appUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        });

        let i = 0;
        await src.stream({
          prompt: openRouterPrompt || scenario.defaultPrompt,
          signal: ac.signal,
          onDelta: (delta) => {
            if (runIdRef.current !== runId) return;
            streaming.append(delta);
            i += 1;
            setProgressIndex(i);
          },
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
        // Abort is expected on cancel/restart.
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.warn('[useStreamingDebug] OpenRouter stream failed:', err);
          setOpenRouterError(msg);
        }
      } finally {
        if (runIdRef.current === runId) {
          abortRef.current = null;
          setIsFeeding(false);
        }
      }

      return;
    }

    let built: { chunks: string[]; unit: 'chars' | 'tokens' | 'chunks' };
    try {
      built = await buildChunks();
    } catch (err) {
      // Tokenization can fail in some bundler setups; fall back to characters.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[useStreamingDebug] Tokenization failed, falling back to characters:', err);
      setTokenizationError(msg);
      setChunkMode('characters');
      built = { chunks: chunkByCharacters(scenario.fakeContent, charsPerChunk), unit: 'chars' };
    }

    // Aborted/restarted while we were preparing chunks.
    if (runIdRef.current !== runId) return;

    const { chunks, unit } = built;
    chunksRef.current = chunks;
    cursorRef.current = 0;

    setProgressUnit(unit);
    setProgressIndex(0);
    setProgressTotal(chunks.length);

    intervalRef.current = setInterval(() => {
      if (runIdRef.current !== runId) return;
      const i = cursorRef.current;
      const next = chunksRef.current[i];

      if (next == null) {
        clearIntervalOnly();
        setIsFeeding(false);
        return;
      }

      streaming.append(next);
      cursorRef.current = i + 1;
      setProgressIndex(i + 1);
    }, Math.max(0, delayMs));
  }, [
    buildChunks,
    charsPerChunk,
    clearIntervalOnly,
    delayMs,
    openRouterApiKey,
    openRouterModelId,
    openRouterPrompt,
    scenario.defaultPrompt,
    scenario.fakeContent,
    source,
    streaming,
  ]);

  const finalize = useCallback(async (): Promise<boolean> => {
    stopFeeding();
    return await streaming.finalize();
  }, [stopFeeding, streaming]);

  const cancel = useCallback(() => {
    stopFeeding();
    streaming.cancel();
  }, [stopFeeding, streaming]);

  // Keyboard shortcuts (DEV-only usage).
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentlyStreaming = useStreamingStore.getState().meta !== null;

      if (e.key === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) setScenarioId('markdown');
      if (e.key === '2' && !e.ctrlKey && !e.metaKey && !e.altKey) setScenarioId('roleplay_long');
      if (e.key === '3' && !e.ctrlKey && !e.metaKey && !e.altKey) setScenarioId('roleplay_spicy');

      // 'S' to start (or restart)
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        await start();
      }

      // Enter to finalize
      if (e.key === 'Enter' && currentlyStreaming) {
        e.preventDefault();
        await finalize();
      }

      // Escape to cancel
      if (e.key === 'Escape' && currentlyStreaming) {
        e.preventDefault();
        cancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancel, finalize, start]);

  // Cleanup on unmount.
  useEffect(() => stopFeeding, [stopFeeding]);

  return {
    uiVisible,
    hideUi: () => setUiVisible(false),

    isStreaming: streaming.isStreaming,
    isFeeding,
    tokenizationError,
    openRouterError,

    source,
    setSource,

    scenarioId,
    setScenarioId,

    openRouterApiKey,
    setOpenRouterApiKey,
    openRouterModelId,
    setOpenRouterModelId,
    openRouterPrompt,
    setOpenRouterPrompt,

    chunkMode,
    setChunkMode,

    openAIEncoding,
    setOpenAIEncoding,

    delayMs,
    setDelayMs,

    charsPerChunk,
    setCharsPerChunk,

    tokensPerChunk,
    setTokensPerChunk,

    progressIndex,
    progressTotal,
    progressUnit,

    start,
    stopFeeding,
    finalize,
    cancel,
  };
}

