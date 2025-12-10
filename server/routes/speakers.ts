import { Hono } from 'hono';
import { prepare } from '../db';
import {
  getCachedSpeaker,
  getAllCachedSpeakers,
  setCachedSpeaker,
  setCachedSpeakers,
  invalidateSpeakerCache,
} from '../cache';
import type { Speaker } from '../../src/types/chat';

export const speakerRoutes = new Hono();

interface SpeakerRow {
  id: string;
  name: string;
  avatar_url: string | null;
  color: string | null;
  is_user: number;
}

function rowToSpeaker(row: SpeakerRow): Speaker {
  return {
    id: row.id,
    name: row.name,
    avatar_url: row.avatar_url ?? undefined,
    color: row.color ?? undefined,
    is_user: Boolean(row.is_user),
  };
}

// ============ List all speakers ============
speakerRoutes.get('/', (c) => {
  // Check cache
  let speakers = getAllCachedSpeakers();
  if (speakers.length > 0) {
    return c.json(speakers);
  }
  
  // Load from DB
  const rows = prepare<SpeakerRow>('SELECT * FROM speakers').all() as SpeakerRow[];
  speakers = rows.map(rowToSpeaker);
  
  // Cache all
  setCachedSpeakers(speakers);
  
  return c.json(speakers);
});

// ============ Get single speaker ============
speakerRoutes.get('/:id', (c) => {
  const speakerId = c.req.param('id');
  
  // Check cache
  let speaker = getCachedSpeaker(speakerId);
  if (speaker) {
    return c.json(speaker);
  }
  
  // Load from DB
  const row = prepare<SpeakerRow>('SELECT * FROM speakers WHERE id = ?').get(speakerId) as SpeakerRow | null;
  if (!row) {
    return c.json({ error: 'Speaker not found' }, 404);
  }
  
  speaker = rowToSpeaker(row);
  setCachedSpeaker(speaker);
  
  return c.json(speaker);
});

// ============ Create speaker ============
speakerRoutes.post('/', async (c) => {
  const body = await c.req.json<Omit<Speaker, 'id'>>();
  const id = crypto.randomUUID();
  
  prepare(`
    INSERT INTO speakers (id, name, avatar_url, color, is_user)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, body.name, body.avatar_url ?? null, body.color ?? null, body.is_user ? 1 : 0);
  
  const speaker: Speaker = { id, ...body };
  setCachedSpeaker(speaker);
  
  return c.json(speaker, 201);
});

// ============ Update speaker ============
speakerRoutes.patch('/:id', async (c) => {
  const speakerId = c.req.param('id');
  const body = await c.req.json<Partial<Omit<Speaker, 'id'>>>();
  
  const updates: string[] = [];
  const values: unknown[] = [];
  
  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    values.push(body.avatar_url);
  }
  if (body.color !== undefined) {
    updates.push('color = ?');
    values.push(body.color);
  }
  if (body.is_user !== undefined) {
    updates.push('is_user = ?');
    values.push(body.is_user ? 1 : 0);
  }
  
  if (updates.length > 0) {
    values.push(speakerId);
    prepare(`UPDATE speakers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    invalidateSpeakerCache(speakerId);
  }
  
  return c.json({ success: true });
});

// ============ Delete speaker ============
speakerRoutes.delete('/:id', (c) => {
  const speakerId = c.req.param('id');
  
  prepare('DELETE FROM speakers WHERE id = ?').run(speakerId);
  invalidateSpeakerCache(speakerId);
  
  return c.json({ success: true });
});
