import { prepare } from '../db';
import type { CharacterCardRecord, CharacterCardRecordMeta } from '../../src/types/characterCard';
import { readCardTextFromPng, writeCardTextToPng } from '../characterCards/pngText';
import { Buffer } from 'node:buffer';

export interface CharacterCardRow {
  id: string;
  name: string;
  spec: string | null;
  spec_version: string | null;
  source: string;
  creator?: string | null;
  token_count?: number | null;
  token_count_updated_at?: number | null;
  raw_json: string;
  png_blob?: Uint8Array | null;
  png_mime?: string | null;
  png_sha256?: string | null;
  png_updated_at?: number | null;
  created_at: number;
  updated_at: number;
}

export function extractNameFromUnknownCard(card: unknown): string | null {
  if (!card || typeof card !== 'object') return null;
  const obj = card as Record<string, unknown>;

  const data = obj.data;
  if (data && typeof data === 'object') {
    const name = (data as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  }

  const name = obj.name;
  if (typeof name === 'string' && name.trim().length > 0) return name.trim();

  return null;
}

export function extractSpec(card: unknown): { spec?: string; spec_version?: string } {
  if (!card || typeof card !== 'object') return {};
  const obj = card as Record<string, unknown>;
  const spec = typeof obj.spec === 'string' ? obj.spec : undefined;
  const spec_version = typeof obj.spec_version === 'string' ? obj.spec_version : undefined;
  return { spec, spec_version };
}

export function extractCreator(card: unknown): string | undefined {
  if (!card || typeof card !== 'object') return undefined;
  const obj = card as Record<string, unknown>;

  const data = obj.data;
  if (data && typeof data === 'object') {
    const creator = (data as Record<string, unknown>).creator;
    if (typeof creator === 'string' && creator.trim().length > 0) return creator.trim();
  }

  const creator = obj.creator;
  if (typeof creator === 'string' && creator.trim().length > 0) return creator.trim();

  return undefined;
}

export function extractTags(card: unknown): string[] | undefined {
  if (!card || typeof card !== 'object') return undefined;
  const obj = card as Record<string, unknown>;

  const readTags = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v
      .filter((x) => typeof x === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return out.length > 0 ? Array.from(new Set(out)) : undefined;
  };

  const data = obj.data;
  if (data && typeof data === 'object') {
    const tags = readTags((data as Record<string, unknown>).tags);
    if (tags) return tags;
  }

  const tags = readTags(obj.tags);
  if (tags) return tags;

  return undefined;
}

export function rowToMeta(row: CharacterCardRow): CharacterCardRecordMeta {
  return {
    id: row.id,
    name: row.name,
    spec: row.spec ?? undefined,
    spec_version: row.spec_version ?? undefined,
    source: row.source,
    creator: row.creator ?? undefined,
    token_count: typeof row.token_count === 'number' ? row.token_count : undefined,
    token_count_updated_at: typeof row.token_count_updated_at === 'number' ? row.token_count_updated_at : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    png_mime: row.png_mime ?? undefined,
    png_sha256: row.png_sha256 ?? undefined,
    has_png: Boolean(row.png_blob && row.png_blob.byteLength > 0),
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

