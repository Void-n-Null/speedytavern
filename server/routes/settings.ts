import { Hono } from 'hono';
import { prepare } from '../db';
import {
  getCachedSetting,
  setCachedSetting,
  invalidateSettingsCache,
} from '../cache';

export const settingsRoutes = new Hono();

interface SettingRow {
  key: string;
  value: string;
  updated_at: number;
}

// ============ Get all settings ============
settingsRoutes.get('/', (c) => {
  const rows = prepare<SettingRow>('SELECT * FROM settings').all() as SettingRow[];
  
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
      setCachedSetting(row.key, settings[row.key]);
    } catch {
      settings[row.key] = row.value;
    }
  }
  
  return c.json(settings);
});

// ============ Get single setting ============
settingsRoutes.get('/:key', (c) => {
  const key = c.req.param('key');
  
  // Check cache
  const cached = getCachedSetting(key);
  if (cached !== undefined) {
    return c.json({ key, value: cached });
  }
  
  // Load from DB
  const row = prepare<SettingRow>('SELECT * FROM settings WHERE key = ?').get(key) as SettingRow | null;
  if (!row) {
    return c.json({ error: 'Setting not found' }, 404);
  }
  
  let value: unknown;
  try {
    value = JSON.parse(row.value);
  } catch {
    value = row.value;
  }
  
  setCachedSetting(key, value);
  
  return c.json({ key, value, updated_at: row.updated_at });
});

// ============ Set/update setting ============
settingsRoutes.put('/:key', async (c) => {
  const key = c.req.param('key');
  const body = await c.req.json<{ value: unknown }>();
  const now = Date.now();
  
  const valueStr = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);
  
  prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, valueStr, now);
  
  setCachedSetting(key, body.value);
  
  return c.json({ success: true, updated_at: now });
});

// ============ Delete setting ============
settingsRoutes.delete('/:key', (c) => {
  const key = c.req.param('key');
  
  prepare('DELETE FROM settings WHERE key = ?').run(key);
  invalidateSettingsCache(key);
  
  return c.json({ success: true });
});

// ============ Bulk update settings ============
settingsRoutes.put('/', async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const now = Date.now();
  
  const stmt = prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  
  for (const [key, value] of Object.entries(body)) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    stmt.run(key, valueStr, now);
    setCachedSetting(key, value);
  }
  
  return c.json({ success: true, updated_at: now });
});
