import { Hono } from 'hono';
import { prepare } from '../db';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const fontRoutes = new Hono();

// Font storage directory
const FONTS_DIR = join(process.cwd(), 'data', 'fonts');

// Ensure fonts directory exists
if (!existsSync(FONTS_DIR)) {
  mkdirSync(FONTS_DIR, { recursive: true });
}

interface FontRow {
  id: string;
  name: string;
  filename: string;
  format: string;
  created_at: number;
}

export interface FontMeta {
  id: string;
  name: string;
  filename: string;
  format: string;
  createdAt: number;
}

function rowToFont(row: FontRow): FontMeta {
  return {
    id: row.id,
    name: row.name,
    filename: row.filename,
    format: row.format,
    createdAt: row.created_at,
  };
}

// ============ List all fonts ============
fontRoutes.get('/', (c) => {
  const rows = prepare<FontRow>('SELECT * FROM fonts ORDER BY name ASC').all() as FontRow[];
  return c.json(rows.map(rowToFont));
});

// ============ Get single font metadata ============
fontRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const row = prepare<FontRow>('SELECT * FROM fonts WHERE id = ?').get(id) as FontRow | null;

  if (!row) {
    return c.json({ error: 'Font not found' }, 404);
  }

  return c.json(rowToFont(row));
});

// ============ Serve font file ============
fontRoutes.get('/:id/file', (c) => {
  const id = c.req.param('id');
  const row = prepare<FontRow>('SELECT * FROM fonts WHERE id = ?').get(id) as FontRow | null;

  if (!row) {
    return c.json({ error: 'Font not found' }, 404);
  }

  const fontPath = join(FONTS_DIR, row.filename);
  if (!existsSync(fontPath)) {
    return c.json({ error: 'Font file missing' }, 404);
  }

  const fontData = readFileSync(fontPath);
  const mimeTypes: Record<string, string> = {
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };

  return new Response(fontData, {
    headers: {
      'Content-Type': mimeTypes[row.format] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000',
    },
  });
});

// ============ Upload font ============
fontRoutes.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const name = formData.get('name') as string | null;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Get file extension
  const originalName = file.name;
  const ext = originalName.split('.').pop()?.toLowerCase() || '';
  const validFormats = ['ttf', 'otf', 'woff', 'woff2'];

  if (!validFormats.includes(ext)) {
    return c.json({ error: `Invalid font format. Supported: ${validFormats.join(', ')}` }, 400);
  }

  // Generate ID and filename
  const id = crypto.randomUUID();
  const filename = `${id}.${ext}`;
  const fontPath = join(FONTS_DIR, filename);

  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(fontPath, buffer);

  // Derive display name from filename if not provided
  const displayName = name || originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  const now = Date.now();

  // Insert into database
  prepare(`
    INSERT INTO fonts (id, name, filename, format, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, displayName, filename, ext, now);

  return c.json({
    id,
    name: displayName,
    filename,
    format: ext,
    createdAt: now,
  }, 201);
});

// ============ Delete font ============
fontRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  const row = prepare<FontRow>('SELECT * FROM fonts WHERE id = ?').get(id) as FontRow | null;

  if (!row) {
    return c.json({ error: 'Font not found' }, 404);
  }

  // Delete file
  const fontPath = join(FONTS_DIR, row.filename);
  if (existsSync(fontPath)) {
    unlinkSync(fontPath);
  }

  // Delete from database
  prepare('DELETE FROM fonts WHERE id = ?').run(id);

  return c.json({ success: true });
});

// ============ Rename font ============
fontRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string }>();

  const existing = prepare<FontRow>('SELECT * FROM fonts WHERE id = ?').get(id) as FontRow | null;
  if (!existing) {
    return c.json({ error: 'Font not found' }, 404);
  }

  if (body.name) {
    prepare('UPDATE fonts SET name = ? WHERE id = ?').run(body.name, id);
  }

  const updated = prepare<FontRow>('SELECT * FROM fonts WHERE id = ?').get(id) as FontRow;
  return c.json(rowToFont(updated));
});
