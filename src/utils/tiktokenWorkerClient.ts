import { countOpenAiTokens, type OpenAIEncodingName } from './tiktoken';
import TiktokenWorker from './tiktoken.worker?worker';

type CountManyResponse =
  | { id: string; ok: true; counts: Record<string, number> }
  | { id: string; ok: false; error: string };

type Pending = {
  resolve: (value: Record<string, number>) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
const pending = new Map<string, Pending>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;

  worker = new TiktokenWorker();
  worker.onmessage = (event: MessageEvent<CountManyResponse>) => {
    const msg = event.data;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.counts);
    else p.reject(new Error(msg.error));
  };
  worker.onerror = (err) => {
    // Fail all pending requests if the worker blows up.
    for (const [, p] of pending) p.reject(err);
    pending.clear();
  };

  return worker;
}

function genId(): string {
  // Good enough: request ids only need to be unique within a session.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function countOpenAiTokensManyOffThread(
  texts: Record<string, string>,
  encoding: OpenAIEncodingName = 'cl100k_base'
): Promise<Record<string, number>> {
  const w = getWorker();
  if (!w) {
    // Fallback: stay correct even if workers are unavailable (older browsers / weird envs).
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(texts)) {
      out[k] = await countOpenAiTokens(v ?? '', encoding);
    }
    return out;
  }

  const id = genId();
  const req = { id, type: 'countMany' as const, encoding, texts };

  return await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage(req);
  });
}






