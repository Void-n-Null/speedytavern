import { Hono } from 'hono';
import { prepare } from '../db';
import type { CharacterCardRecord, CharacterCardRecordMeta } from '../../src/types/characterCard';
import { CARD_PNG_HYGIENE } from '../characterCards/hygiene';
import { readCardTextFromPng, writeCardTextToPng } from '../characterCards/pngText';
import { Buffer } from 'node:buffer';

export const characterCardRoutes = new Hono();

interface CharacterCardRow {
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

function extractNameFromUnknownCard(card: unknown): string | null {
  if (!card || typeof card !== 'object') return null;
  const obj = card as Record<string, unknown>;

  // V2/V3 often have `data.name`.
  const data = obj.data;
  if (data && typeof data === 'object') {
    const name = (data as Record<string, unknown>).name;
    if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  }

  // V1 has top-level `name`.
  const name = obj.name;
  if (typeof name === 'string' && name.trim().length > 0) return name.trim();

  return null;
}

function extractSpec(card: unknown): { spec?: string; spec_version?: string } {
  if (!card || typeof card !== 'object') return {};
  const obj = card as Record<string, unknown>;
  const spec = typeof obj.spec === 'string' ? obj.spec : undefined;
  const spec_version = typeof obj.spec_version === 'string' ? obj.spec_version : undefined;
  return { spec, spec_version };
}

function extractCreator(card: unknown): string | undefined {
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

function rowToMeta(row: CharacterCardRow): CharacterCardRecordMeta {
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

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============ List (metadata only) ============
characterCardRoutes.get('/', (c) => {
  const rows = prepare<CharacterCardRow>(`
    SELECT id, name, spec, spec_version, source, creator, token_count, token_count_updated_at, raw_json, created_at, updated_at, png_mime, png_sha256, png_blob
    FROM character_cards
    ORDER BY updated_at DESC
  `).all() as CharacterCardRow[];

  const needsCreatorBackfill = rows.some((r) => r.creator == null);
  if (!needsCreatorBackfill) return c.json(rows.map(rowToMeta));

  const updateCreator = prepare('UPDATE character_cards SET creator = ? WHERE id = ?');

  const out: CharacterCardRecordMeta[] = [];
  for (const row of rows) {
    let creator = row.creator ?? undefined;

    if (creator == null) {
      try {
        const parsed = JSON.parse(row.raw_json);
        creator = extractCreator(parsed);
        if (creator != null) updateCreator.run(creator, row.id);
      } catch {
        // ignore bad JSON; keep values empty
      }
    }

    out.push(
      rowToMeta({
        ...row,
        creator: creator ?? row.creator ?? null,
      })
    );
  }

  return c.json(out);
});

// ============ Get single (includes raw_json) ============
characterCardRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const row = prepare<CharacterCardRow>('SELECT * FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!row) return c.json({ error: 'Character card not found' }, 404);

  const record: CharacterCardRecord = {
    ...rowToMeta(row),
    raw_json: row.raw_json,
  };

  return c.json(record);
});

// ============ Import PNG ============
characterCardRoutes.post('/import/png', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return c.json({ error: 'No file provided' }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength > CARD_PNG_HYGIENE.maxOriginalBytes && CARD_PNG_HYGIENE.oversizePolicy === 'reject') {
    return c.json(
      { error: `PNG exceeds max size (${CARD_PNG_HYGIENE.maxOriginalBytes} bytes). Adjust server/characterCards/hygiene.ts to change.` },
      413,
    );
  }

  let readResult: { keyword: 'chara' | 'ccv3'; raw_json: string };
  try {
    readResult = readCardTextFromPng(bytes);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Failed to read PNG metadata' }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readResult.raw_json);
  } catch {
    return c.json({ error: 'PNG metadata JSON is invalid' }, 400);
  }

  const name = extractNameFromUnknownCard(parsed);
  if (!name) {
    return c.json({ error: 'Card must contain a non-empty name (either name or data.name)' }, 400);
  }

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const png_sha256 = await sha256Hex(bytes);

  // Best-effort dedupe:
  // - Dedupe only when BOTH the PNG bytes and embedded JSON match an existing row.
  //
  // Important: there may be multiple rows with the same `png_sha256` (e.g. user edited a card after import,
  // then re-imported the original PNG). We must match on raw_json too, otherwise a random LIMIT 1 row can
  // make dedupe appear "broken".
  const existing = prepare<CharacterCardRow>(
    'SELECT * FROM character_cards WHERE png_sha256 = ? AND raw_json = ? LIMIT 1',
  ).get(png_sha256, readResult.raw_json) as
    | CharacterCardRow
    | null;
  if (existing) {
    const record: CharacterCardRecord = { ...rowToMeta(existing), raw_json: existing.raw_json };
    return c.json(record, 200);
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const source = readResult.keyword === 'ccv3' ? 'png_ccv3' : 'png_chara';
  const png_mime = 'image/png';

  prepare(`
    INSERT INTO character_cards (id, name, spec, spec_version, source, creator, token_count, raw_json, png_blob, png_mime, png_sha256, png_updated_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    spec ?? null,
    spec_version ?? null,
    source,
    creator ?? null,
    null,
    readResult.raw_json,
    Buffer.from(bytes),
    png_mime,
    png_sha256,
    now,
    now,
    now
  );

  const record: CharacterCardRecord = {
    id,
    name,
    spec,
    spec_version,
    source,
    creator,
    raw_json: readResult.raw_json,
    created_at: now,
    updated_at: now,
    png_mime,
    png_sha256,
    has_png: true,
  };

  return c.json(record, 201);
});

// ============ Import JSON ============
characterCardRoutes.post('/import/json', async (c) => {
  const body = await c.req.json<unknown>();

  let raw_json: string | null = null;
  let source: string = 'json';

  if (body && typeof body === 'object' && typeof (body as any).raw_json === 'string') {
    raw_json = String((body as any).raw_json);
  } else {
    raw_json = JSON.stringify(body);
  }

  if (!raw_json || raw_json.length === 0) return c.json({ error: 'Missing raw_json / card payload' }, 400);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw_json);
  } catch {
    return c.json({ error: 'raw_json must be valid JSON' }, 400);
  }

  const name = extractNameFromUnknownCard(parsed);
  if (!name) return c.json({ error: 'Card must contain a non-empty name (either name or data.name)' }, 400);

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const id = crypto.randomUUID();
  const now = Date.now();

  prepare(`
    INSERT INTO character_cards (id, name, spec, spec_version, source, creator, token_count, raw_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, spec ?? null, spec_version ?? null, source, creator ?? null, null, raw_json, now, now);

  const record: CharacterCardRecord = {
    id,
    name,
    spec,
    spec_version,
    source,
    creator,
    raw_json,
    created_at: now,
    updated_at: now,
  };

  return c.json(record, 201);
});

// ============ Export JSON ============
characterCardRoutes.get('/:id/export/json', (c) => {
  const id = c.req.param('id');
  const row = prepare<CharacterCardRow>('SELECT raw_json FROM character_cards WHERE id = ?').get(id) as { raw_json: string } | null;
  if (!row) return c.json({ error: 'Character card not found' }, 404);

  return new Response(row.raw_json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURI(`${id}.json`)}"`,
    },
  });
});

// ============ Export PNG ============
characterCardRoutes.get('/:id/export/png', (c) => {
  const id = c.req.param('id');
  const row = prepare<CharacterCardRow>('SELECT id, name, source, spec, raw_json, png_blob FROM character_cards WHERE id = ?').get(id) as
    | CharacterCardRow
    | null;
  if (!row) return c.json({ error: 'Character card not found' }, 404);
  if (!row.png_blob || row.png_blob.byteLength === 0) return c.json({ error: 'No PNG stored for this card' }, 404);

  // Primary signal: the import/source type tracks how the PNG metadata was originally stored.
  // Fallback: infer from spec when source doesn't indicate a PNG keyword (e.g. JSON imports / legacy rows).
  const keyword: 'ccv3' | 'chara' =
    row.source === 'png_ccv3' ? 'ccv3' : row.source === 'png_chara' ? 'chara' : row.spec === 'chara_card_v3' ? 'ccv3' : 'chara';
  const out = writeCardTextToPng(Buffer.from(row.png_blob), row.raw_json, keyword);

  const safeName = (row.name || 'character').replace(/[^a-z0-9 _.-]/gi, '_');
  const filename = `${safeName}.png`;

  return new Response(out, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${encodeURI(filename)}"`,
    },
  });
});

// ============ Get Avatar (PNG blob) ============
characterCardRoutes.get('/:id/avatar', (c) => {
  const id = c.req.param('id');
  const row = prepare<CharacterCardRow>('SELECT png_blob, name FROM character_cards WHERE id = ?').get(id) as Pick<CharacterCardRow, 'png_blob' | 'name'> | null;
  if (!row) return c.json({ error: 'Character card not found' }, 404);
  if (!row.png_blob || row.png_blob.byteLength === 0) {
    return c.json({ error: 'No avatar stored for this card' }, 404);
  }

  return new Response(row.png_blob, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=3600',
    },
  });
});

// ============ Update ============
characterCardRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<unknown>();

  const existing = prepare<CharacterCardRow>('SELECT * FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

  // Accept either { raw_json: string } or the card object itself
  let raw_json: string;
  if (body && typeof body === 'object' && typeof (body as any).raw_json === 'string') {
    raw_json = String((body as any).raw_json);
  } else {
    raw_json = JSON.stringify(body);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw_json);
  } catch {
    return c.json({ error: 'raw_json must be valid JSON' }, 400);
  }

  const name = extractNameFromUnknownCard(parsed);
  if (!name) {
    return c.json({ error: 'Card must contain a non-empty name (either name or data.name)' }, 400);
  }

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const now = Date.now();

  prepare(`
    UPDATE character_cards 
    SET name = ?, spec = ?, spec_version = ?, creator = ?, token_count = NULL, token_count_updated_at = NULL, raw_json = ?, updated_at = ?
    WHERE id = ?
  `).run(name, spec ?? null, spec_version ?? null, creator ?? null, raw_json, now, id);

  const record: CharacterCardRecord = {
    id,
    name,
    spec,
    spec_version,
    source: existing.source,
    creator,
    raw_json,
    created_at: existing.created_at,
    updated_at: now,
    png_mime: existing.png_mime ?? undefined,
    png_sha256: existing.png_sha256 ?? undefined,
    has_png: Boolean(existing.png_blob && existing.png_blob.byteLength > 0),
  };

  return c.json(record);
});

// ============ Update Token Count (computed client-side) ============
characterCardRoutes.patch('/:id/token-count', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<unknown>();

  const token_count = body && typeof body === 'object' ? (body as any).token_count : undefined;
  if (typeof token_count !== 'number' || !Number.isFinite(token_count) || token_count < 0) {
    return c.json({ error: 'token_count must be a non-negative number' }, 400);
  }

  const existing = prepare<CharacterCardRow>('SELECT id FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

  const now = Date.now();
  prepare('UPDATE character_cards SET token_count = ?, token_count_updated_at = ? WHERE id = ?').run(
    Math.floor(token_count),
    now,
    id
  );

  return c.json({ success: true, token_count: Math.floor(token_count), token_count_updated_at: now });
});

// ============ Update Avatar ============
characterCardRoutes.patch('/:id/avatar', async (c) => {
  const id = c.req.param('id');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return c.json({ error: 'No file provided' }, 400);

  const existing = prepare<CharacterCardRow>('SELECT id FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.byteLength > CARD_PNG_HYGIENE.maxOriginalBytes && CARD_PNG_HYGIENE.oversizePolicy === 'reject') {
    return c.json(
      { error: `PNG exceeds max size (${CARD_PNG_HYGIENE.maxOriginalBytes} bytes)` },
      413,
    );
  }

  const png_sha256 = await sha256Hex(bytes);
  const now = Date.now();

  prepare(`
    UPDATE character_cards 
    SET png_blob = ?, png_mime = 'image/png', png_sha256 = ?, png_updated_at = ?, updated_at = ?
    WHERE id = ?
  `).run(Buffer.from(bytes), png_sha256, now, now, id);

  return c.json({ success: true, png_sha256 });
});

// ============ Remove Avatar ============
characterCardRoutes.delete('/:id/avatar', (c) => {
  const id = c.req.param('id');
  const existing = prepare<CharacterCardRow>('SELECT id FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

  const now = Date.now();
  prepare(`
    UPDATE character_cards
    SET png_blob = NULL, png_mime = NULL, png_sha256 = NULL, png_updated_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(now, id);

  return c.json({ success: true });
});

// ============ Delete ============
characterCardRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const existing = prepare<{ id: string }>('SELECT id FROM character_cards WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

  prepare('DELETE FROM character_cards WHERE id = ?').run(id);
  return c.json({ success: true, deleted: id });
});

// ============ Create ============
// Accepts either:
// - { raw_json: string, source?: string }
// - any JSON object (treated as the card itself)
characterCardRoutes.post('/', async (c) => {
  const body = await c.req.json<unknown>();

  let raw_json: string | null = null;
  let source: string = 'unknown';

  if (body && typeof body === 'object' && typeof (body as any).raw_json === 'string') {
    raw_json = String((body as any).raw_json);
    if (typeof (body as any).source === 'string' && (body as any).source.length > 0) {
      source = String((body as any).source);
    }
  } else {
    // body is the card object
    raw_json = JSON.stringify(body);
  }

  if (!raw_json || raw_json.length === 0) {
    return c.json({ error: 'Missing raw_json / card payload' }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw_json);
  } catch {
    return c.json({ error: 'raw_json must be valid JSON' }, 400);
  }

  const name = extractNameFromUnknownCard(parsed);
  if (!name) {
    return c.json({ error: 'Card must contain a non-empty name (either name or data.name)' }, 400);
  }

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const id = crypto.randomUUID();
  const now = Date.now();

  prepare(`
    INSERT INTO character_cards (id, name, spec, spec_version, source, creator, token_count, raw_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, spec ?? null, spec_version ?? null, source, creator ?? null, null, raw_json, now, now);

  const record: CharacterCardRecord = {
    id,
    name,
    spec,
    spec_version,
    source,
    creator,
    raw_json,
    created_at: now,
    updated_at: now,
  };

  return c.json(record, 201);
});


