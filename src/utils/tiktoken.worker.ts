/// <reference lib="webworker" />

import { getTiktoken, type OpenAIEncodingName } from './tiktoken';

type CountManyRequest = {
  id: string;
  type: 'countMany';
  encoding: OpenAIEncodingName;
  texts: Record<string, string>;
};

type CountManyResponse =
  | { id: string; ok: true; counts: Record<string, number> }
  | { id: string; ok: false; error: string };

type WorkerRequest = CountManyRequest;
type WorkerResponse = CountManyResponse;

async function handleCountMany(req: CountManyRequest): Promise<CountManyResponse> {
  try {
    const enc = await getTiktoken(req.encoding);
    const counts: Record<string, number> = {};
    for (const [key, text] of Object.entries(req.texts)) {
      counts[key] = enc.encode(text ?? '').length;
    }
    return { id: req.id, ok: true, counts };
  } catch (e) {
    return { id: req.id, ok: false, error: e instanceof Error ? e.message : 'Worker tokenization failed' };
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  let res: WorkerResponse;
  switch (req.type) {
    case 'countMany':
      res = await handleCountMany(req);
      break;
    default:
      res = { id: (req as any)?.id ?? 'unknown', ok: false, error: 'Unknown worker request' };
      break;
  }
  self.postMessage(res);
};






