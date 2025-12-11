/**
 * Design Templates API Routes
 * 
 * CRUD operations for reusable design configuration templates.
 * Templates can be saved, loaded, exported, and shared.
 */

import { Hono } from 'hono';
import { getDb, prepare } from '../db';

const app = new Hono();

interface DesignTemplateRow {
  id: string;
  name: string;
  description: string | null;
  config: string;
  created_at: number;
  updated_at: number;
}

interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

function rowToTemplate(row: DesignTemplateRow): DesignTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/design-templates - List all templates
app.get('/', (c) => {
  const stmt = prepare<DesignTemplateRow>('SELECT * FROM design_templates ORDER BY updated_at DESC');
  const rows = stmt.all() as DesignTemplateRow[];
  return c.json(rows.map(rowToTemplate));
});

// GET /api/design-templates/:id - Get single template
app.get('/:id', (c) => {
  const { id } = c.req.param();
  const stmt = prepare<DesignTemplateRow>('SELECT * FROM design_templates WHERE id = ?');
  const row = stmt.get(id) as DesignTemplateRow | undefined;
  
  if (!row) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  return c.json(rowToTemplate(row));
});

// POST /api/design-templates - Create new template
app.post('/', async (c) => {
  const body = await c.req.json();
  const { name, description, config } = body;
  
  if (!name || !config) {
    return c.json({ error: 'Name and config are required' }, 400);
  }
  
  const id = crypto.randomUUID();
  const now = Date.now();
  
  const stmt = prepare(
    'INSERT INTO design_templates (id, name, description, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, description || null, JSON.stringify(config), now, now);
  
  return c.json({
    id,
    name,
    description: description || null,
    config,
    createdAt: now,
    updatedAt: now,
  }, 201);
});

// PATCH /api/design-templates/:id - Update template
app.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, description, config } = body;
  
  const checkStmt = prepare<DesignTemplateRow>('SELECT * FROM design_templates WHERE id = ?');
  const existing = checkStmt.get(id) as DesignTemplateRow | undefined;
  
  if (!existing) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  const now = Date.now();
  const newName = name ?? existing.name;
  const newDescription = description !== undefined ? description : existing.description;
  const newConfig = config ? JSON.stringify(config) : existing.config;
  
  const updateStmt = prepare(
    'UPDATE design_templates SET name = ?, description = ?, config = ?, updated_at = ? WHERE id = ?'
  );
  updateStmt.run(newName, newDescription, newConfig, now, id);
  
  return c.json({
    id,
    name: newName,
    description: newDescription,
    config: config || JSON.parse(existing.config),
    createdAt: existing.created_at,
    updatedAt: now,
  });
});

// DELETE /api/design-templates/:id - Delete template
app.delete('/:id', (c) => {
  const { id } = c.req.param();
  
  const checkStmt = prepare<DesignTemplateRow>('SELECT id FROM design_templates WHERE id = ?');
  const existing = checkStmt.get(id);
  
  if (!existing) {
    return c.json({ error: 'Template not found' }, 404);
  }
  
  const deleteStmt = prepare('DELETE FROM design_templates WHERE id = ?');
  deleteStmt.run(id);
  
  return c.json({ success: true });
});

export default app;
