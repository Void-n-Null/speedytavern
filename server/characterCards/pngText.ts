import extract from 'png-chunks-extract';
import encode from 'png-chunks-encode';
import PNGtext from 'png-chunk-text';
import { Buffer } from 'node:buffer';

export type CardPngKeyword = 'chara' | 'ccv3';

export interface ReadCardTextResult {
  keyword: CardPngKeyword;
  raw_json: string;
}

function toUint8Array(input: Uint8Array | ArrayBuffer | Buffer): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return new Uint8Array(input);
}

/**
 * Reads SillyTavern/Tavern card JSON from a PNG `tEXt` chunk.
 * - Prefers `ccv3` if present, else falls back to `chara`.
 * - Chunk text is base64(JSON UTF-8).
 */
export function readCardTextFromPng(pngBytes: Uint8Array | Buffer): ReadCardTextResult {
  const chunks = extract(toUint8Array(pngBytes));
  const textChunks = chunks
    .filter((c: any) => c.name === 'tEXt')
    .map((c: any) => PNGtext.decode(c.data));

  const find = (keyword: CardPngKeyword) =>
    textChunks.find((t: any) => typeof t.keyword === 'string' && t.keyword.toLowerCase() === keyword);

  const v3 = find('ccv3');
  if (v3 && typeof v3.text === 'string') {
    return { keyword: 'ccv3', raw_json: Buffer.from(v3.text, 'base64').toString('utf8') };
  }

  const v2 = find('chara');
  if (v2 && typeof v2.text === 'string') {
    return { keyword: 'chara', raw_json: Buffer.from(v2.text, 'base64').toString('utf8') };
  }

  throw new Error('No card metadata found (expected tEXt chunk keyword "ccv3" or "chara").');
}

/**
 * Writes card JSON into a PNG `tEXt` chunk.
 * - Removes existing `chara` and `ccv3` tEXt chunks to avoid mismatches.
 * - Inserts the new chunk right before IEND.
 */
export function writeCardTextToPng(
  pngBytes: Uint8Array | Buffer,
  rawJson: string,
  keyword: CardPngKeyword,
): Buffer {
  const chunks: any[] = extract(toUint8Array(pngBytes));

  // Remove existing chara/ccv3 tEXt chunks
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk?.name !== 'tEXt') continue;
    try {
      const decoded = PNGtext.decode(chunk.data);
      const k = typeof decoded.keyword === 'string' ? decoded.keyword.toLowerCase() : '';
      if (k === 'chara' || k === 'ccv3') {
        chunks.splice(i, 1);
      }
    } catch {
      // ignore malformed tEXt chunks
    }
  }

  const base64Payload = Buffer.from(rawJson, 'utf8').toString('base64');
  const newChunk = PNGtext.encode(keyword, base64Payload);

  // Insert before IEND (last chunk in typical PNGs)
  chunks.splice(-1, 0, newChunk);

  return Buffer.from(encode(chunks));
}







