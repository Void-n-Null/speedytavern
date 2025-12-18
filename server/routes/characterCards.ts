import { Hono } from 'hono';
import { prepare } from '../db';
import type { CharacterCardRecord, CharacterCardRecordMeta } from '../../src/types/characterCard';
import { CARD_PNG_HYGIENE } from '../characterCards/hygiene';
import { readCardTextFromPng, writeCardTextToPng } from '../characterCards/pngText';
import { Buffer } from 'node:buffer';
import {
  type CharacterCardRow,
  extractNameFromUnknownCard,
  extractSpec,
  extractCreator,
  extractTags,
  rowToMeta,
  sha256Hex,
} from '../characterCards/service';

export const characterCardRoutes = new Hono();

// ============ List (metadata only) ============
characterCardRoutes.get('/', (c) => {
  const rows = prepare<CharacterCardRow & { has_png_flag: number }>(`
    SELECT id, name, spec, spec_version, source, creator, token_count, token_count_updated_at, raw_json, created_at, updated_at, png_mime, png_sha256,
           (png_blob IS NOT NULL) as has_png_flag
    FROM character_cards
    ORDER BY updated_at DESC
  `).all() as (CharacterCardRow & { has_png_flag: number })[];

  const out: CharacterCardRecordMeta[] = [];
  for (const row of rows) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(row.raw_json);
    } catch {
      parsed = null;
    }

    const tags = parsed ? extractTags(parsed) : undefined;

    out.push({
      ...rowToMeta(row),
      has_png: Boolean(row.has_png_flag),
      tags,
    });
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

  const existing = prepare<CharacterCardRow>(
    'SELECT * FROM character_cards WHERE png_sha256 = ? AND raw_json = ? LIMIT 1',
  ).get(png_sha256, readResult.raw_json) as CharacterCardRow | null;
  
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
    id, name, spec ?? null, spec_version ?? null, source, creator ?? null, null, readResult.raw_json,
    Buffer.from(bytes), png_mime, png_sha256, now, now, now
  );

  const record: CharacterCardRecord = {
    id, name, spec, spec_version, source, creator,
    raw_json: readResult.raw_json,
    created_at: now, updated_at: now,
    png_mime, png_sha256, has_png: true,
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

  if (!raw_json) return c.json({ error: 'Missing raw_json / card payload' }, 400);

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

  const record: CharacterCardRecord = { id, name, spec, spec_version, source, creator, raw_json, created_at: now, updated_at: now };
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
  const row = prepare<CharacterCardRow>('SELECT id, name, source, spec, raw_json, png_blob FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!row || !row.png_blob) return c.json({ error: 'Character card or PNG not found' }, 404);

  const keyword: 'ccv3' | 'chara' =
    row.source === 'png_ccv3' ? 'ccv3' : row.source === 'png_chara' ? 'chara' : row.spec === 'chara_card_v3' ? 'ccv3' : 'chara';
  const out = writeCardTextToPng(Buffer.from(row.png_blob), row.raw_json, keyword);

  const safeName = (row.name || 'character').replace(/[^a-z0-9 _.-]/gi, '_');
  return new Response(out, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${encodeURI(`${safeName}.png`)}"`,
    },
  });
});

// ============ Get Avatar (PNG blob) ============
characterCardRoutes.get('/:id/avatar', (c) => {
  const id = c.req.param('id');
  const row = prepare<CharacterCardRow>('SELECT png_blob FROM character_cards WHERE id = ?').get(id) as Pick<CharacterCardRow, 'png_blob'> | null;
  if (!row || !row.png_blob) return c.json({ error: 'Avatar not found' }, 404);

  return new Response(row.png_blob, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600' } });
});

// ============ Update ============
characterCardRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<unknown>();
  const existing = prepare<CharacterCardRow>('SELECT * FROM character_cards WHERE id = ?').get(id) as CharacterCardRow | null;
  if (!existing) return c.json({ error: 'Character card not found' }, 404);

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
  if (!name) return c.json({ error: 'Card must contain a name' }, 400);

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const now = Date.now();

  prepare(`
    UPDATE character_cards 
    SET name = ?, spec = ?, spec_version = ?, creator = ?, token_count = NULL, token_count_updated_at = NULL, raw_json = ?, updated_at = ?
    WHERE id = ?
  `).run(name, spec ?? null, spec_version ?? null, creator ?? null, raw_json, now, id);

  const record: CharacterCardRecord = {
    id, name, spec, spec_version, source: existing.source, creator, raw_json,
    created_at: existing.created_at, updated_at: now,
    png_mime: existing.png_mime ?? undefined, png_sha256: existing.png_sha256 ?? undefined,
    has_png: Boolean(existing.png_blob && existing.png_blob.byteLength > 0),
  };

  return c.json(record);
});

// ============ Update Token Count ============
characterCardRoutes.patch('/:id/token-count', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const token_count = body?.token_count;
  if (typeof token_count !== 'number' || token_count < 0) return c.json({ error: 'Invalid token_count' }, 400);

  const now = Date.now();
  prepare('UPDATE character_cards SET token_count = ?, token_count_updated_at = ? WHERE id = ?').run(Math.floor(token_count), now, id);
  return c.json({ success: true, token_count: Math.floor(token_count), token_count_updated_at: now });
});

// ============ Update Avatar ============
characterCardRoutes.patch('/:id/avatar', async (c) => {
  const id = c.req.param('id');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > CARD_PNG_HYGIENE.maxOriginalBytes && CARD_PNG_HYGIENE.oversizePolicy === 'reject') {
    return c.json({ error: 'PNG too large' }, 413);
  }

  const png_sha256 = await sha256Hex(bytes);
  const now = Date.now();
  prepare(`UPDATE character_cards SET png_blob = ?, png_mime = 'image/png', png_sha256 = ?, png_updated_at = ?, updated_at = ? WHERE id = ?`)
    .run(Buffer.from(bytes), png_sha256, now, now, id);

  return c.json({ success: true, png_sha256 });
});

// ============ Remove Avatar ============
characterCardRoutes.delete('/:id/avatar', (c) => {
  const id = c.req.param('id');
  prepare(`UPDATE character_cards SET png_blob = NULL, png_mime = NULL, png_sha256 = NULL, png_updated_at = NULL, updated_at = ? WHERE id = ?`)
    .run(Date.now(), id);
  return c.json({ success: true });
});

// ============ Delete ============
characterCardRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  prepare('DELETE FROM character_cards WHERE id = ?').run(id);
  return c.json({ success: true, deleted: id });
});

// ============ Create ============
characterCardRoutes.post('/', async (c) => {
  const body = await c.req.json<any>();
  const raw_json = typeof body?.raw_json === 'string' ? body.raw_json : JSON.stringify(body);
  if (!raw_json) return c.json({ error: 'No payload' }, 400);

  let parsed: any;
  try { parsed = JSON.parse(raw_json); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

  const name = extractNameFromUnknownCard(parsed);
  if (!name) return c.json({ error: 'No name' }, 400);

  const { spec, spec_version } = extractSpec(parsed);
  const creator = extractCreator(parsed);
  const id = crypto.randomUUID();
  const now = Date.now();
  const source = body?.source || 'unknown';

  prepare(`INSERT INTO character_cards (id, name, spec, spec_version, source, creator, token_count, raw_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, spec ?? null, spec_version ?? null, source, creator ?? null, null, raw_json, now, now);

  return c.json({ id, name, spec, spec_version, source, creator, raw_json, created_at: now, updated_at: now }, 201);
});
