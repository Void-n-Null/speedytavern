import { Hono } from 'hono';
import { prepare, transaction } from '../db';
import type { MessageStyleConfig } from '../../src/types/messageStyle';
import { defaultMessageStyleConfig } from '../../src/types/messageStyle';

export const profileRoutes = new Hono();

interface ProfileRow {
  id: string;
  name: string;
  message_style: string;
  is_default: number;
  created_at: number;
  updated_at: number;
}

interface ProfileResponse {
  id: string;
  name: string;
  messageStyle: MessageStyleConfig;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ProfileMetaResponse {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

function rowToProfile(row: ProfileRow): ProfileResponse {
  return {
    id: row.id,
    name: row.name,
    messageStyle: JSON.parse(row.message_style),
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToProfileMeta(row: ProfileRow): ProfileMetaResponse {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============ List all profiles ============
profileRoutes.get('/', (c) => {
  const rows = prepare<ProfileRow>('SELECT * FROM profiles ORDER BY created_at DESC').all() as ProfileRow[];
  return c.json(rows.map(rowToProfileMeta));
});

// ============ Get active/default profile ============
profileRoutes.get('/active', (c) => {
  const row = prepare<ProfileRow>('SELECT * FROM profiles WHERE is_default = 1').get() as ProfileRow | null;
  
  if (!row) {
    return c.json({ error: 'No active profile found' }, 404);
  }
  
  return c.json(rowToProfile(row));
});

// ============ Get single profile ============
profileRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const row = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  
  if (!row) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  return c.json(rowToProfile(row));
});

// ============ Create profile ============
profileRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    messageStyle?: MessageStyleConfig;
    isDefault?: boolean;
  }>();
  
  const id = crypto.randomUUID();
  const now = Date.now();
  const messageStyle = body.messageStyle ?? defaultMessageStyleConfig;
  const isDefault = body.isDefault ?? false;
  
  transaction(() => {
    // If setting as default, unset all others first
    if (isDefault) {
      prepare('UPDATE profiles SET is_default = 0, updated_at = ? WHERE is_default = 1').run(now);
    }
    
    prepare(`
      INSERT INTO profiles (id, name, message_style, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, body.name, JSON.stringify(messageStyle), isDefault ? 1 : 0, now, now);
  });
  
  return c.json({
    id,
    name: body.name,
    messageStyle,
    isDefault,
    createdAt: now,
    updatedAt: now,
  }, 201);
});

// ============ Update profile ============
profileRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    messageStyle?: MessageStyleConfig;
  }>();
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  const now = Date.now();
  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];
  
  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  
  if (body.messageStyle !== undefined) {
    updates.push('message_style = ?');
    values.push(JSON.stringify(body.messageStyle));
  }
  
  values.push(id);
  
  prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  // Return updated profile
  const updated = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow;
  return c.json(rowToProfile(updated));
});

// ============ Delete profile ============
profileRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  // Don't allow deleting the only profile
  const count = prepare<{ count: number }>('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  if (count.count <= 1) {
    return c.json({ error: 'Cannot delete the only profile' }, 400);
  }
  
  const wasDefault = existing.is_default === 1;
  
  prepare('DELETE FROM profiles WHERE id = ?').run(id);
  
  // If we deleted the default, make the most recent one default
  if (wasDefault) {
    const now = Date.now();
    prepare(`
      UPDATE profiles SET is_default = 1, updated_at = ?
      WHERE id = (SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1)
    `).run(now);
  }
  
  return c.json({ success: true });
});

// ============ Activate profile (set as default) ============
profileRoutes.post('/:id/activate', (c) => {
  const id = c.req.param('id');
  
  const existing = prepare<ProfileRow>('SELECT * FROM profiles WHERE id = ?').get(id) as ProfileRow | null;
  if (!existing) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  
  const now = Date.now();
  
  transaction(() => {
    // Unset all defaults
    prepare('UPDATE profiles SET is_default = 0, updated_at = ? WHERE is_default = 1').run(now);
    // Set this one as default
    prepare('UPDATE profiles SET is_default = 1, updated_at = ? WHERE id = ?').run(now, id);
  });
  
  return c.json({ success: true, updatedAt: now });
});

// ============ Seed default profile if none exists ============
export function seedDefaultProfileIfEmpty(): void {
  const count = prepare<{ count: number }>('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
  
  if (count.count === 0) {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    prepare(`
      INSERT INTO profiles (id, name, message_style, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, 'Default', JSON.stringify(defaultMessageStyleConfig), 1, now, now);
    
    console.log('🎨 Created default profile');
  }
}
