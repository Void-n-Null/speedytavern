import { Hono } from 'hono';
import { prepare, transaction } from '../db';
import {
  getCachedChat,
  setCachedChat,
  invalidateChatCache,
  type CachedChat,
} from '../cache';
import type { ChatNode } from '../../src/types/chat';

export const chatRoutes = new Hono();

// Types for DB rows
interface ChatRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface NodeRow {
  id: string;
  chat_id: string;
  parent_id: string | null;
  child_ids: string;
  active_child_index: number | null;
  speaker_id: string;
  message: string;
  is_bot: number;
  created_at: number;
  updated_at: number | null;
}

// ============ List all chats (metadata only) ============
chatRoutes.get('/', (c) => {
  const chats = prepare<ChatRow>(`
    SELECT id, name, created_at, updated_at 
    FROM chats 
    ORDER BY updated_at DESC
  `).all() as ChatRow[];
  
  return c.json(chats);
});

// ============ Get single chat with all nodes ============
chatRoutes.get('/:id', (c) => {
  const chatId = c.req.param('id');
  
  // Check cache first
  let cached = getCachedChat(chatId);
  if (cached) {
    return c.json({
      id: cached.id,
      name: cached.name,
      nodes: Array.from(cached.nodes.values()),
      rootId: cached.rootId,
      tailId: cached.tailId,
    });
  }
  
  // Load from DB
  const chat = prepare<ChatRow>('SELECT * FROM chats WHERE id = ?').get(chatId) as ChatRow | null;
  if (!chat) {
    return c.json({ error: 'Chat not found' }, 404);
  }
  
  const nodeRows = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE chat_id = ?').all(chatId) as NodeRow[];
  
  const nodes = new Map<string, ChatNode>();
  let rootId: string | null = null;
  
  for (const row of nodeRows) {
    const node: ChatNode = {
      id: row.id,
      parent_id: row.parent_id,
      child_ids: JSON.parse(row.child_ids),
      active_child_index: row.active_child_index,
      speaker_id: row.speaker_id,
      message: row.message,
      is_bot: Boolean(row.is_bot),
      created_at: row.created_at,
      updated_at: row.updated_at ?? undefined,
    };
    nodes.set(node.id, node);
    
    if (node.parent_id === null) {
      rootId = node.id;
    }
  }
  
  // Find tail by following active path
  let tailId = rootId;
  if (tailId) {
    let current = nodes.get(tailId);
    while (current && current.child_ids.length > 0 && current.active_child_index !== null) {
      tailId = current.child_ids[current.active_child_index];
      current = nodes.get(tailId);
    }
  }
  
  // Cache it
  cached = {
    id: chat.id,
    name: chat.name,
    nodes,
    rootId,
    tailId,
    lastAccess: Date.now(),
  };
  setCachedChat(cached);
  
  return c.json({
    id: chat.id,
    name: chat.name,
    nodes: Array.from(nodes.values()),
    rootId,
    tailId,
  });
});

// ============ Create new chat ============
chatRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name: string }>();
  const id = crypto.randomUUID();
  const now = Date.now();
  
  prepare('INSERT INTO chats (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(id, body.name, now, now);
  
  return c.json({ id, name: body.name, created_at: now, updated_at: now }, 201);
});

// ============ Update chat metadata ============
chatRoutes.patch('/:id', async (c) => {
  const chatId = c.req.param('id');
  const body = await c.req.json<{ name?: string }>();
  const now = Date.now();
  
  if (body.name) {
    prepare('UPDATE chats SET name = ?, updated_at = ? WHERE id = ?')
      .run(body.name, now, chatId);
    invalidateChatCache(chatId);
  }
  
  return c.json({ success: true });
});

// ============ Delete chat ============
chatRoutes.delete('/:id', (c) => {
  const chatId = c.req.param('id');
  
  transaction(() => {
    prepare('DELETE FROM chat_nodes WHERE chat_id = ?').run(chatId);
    prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  });
  
  invalidateChatCache(chatId);
  
  return c.json({ success: true });
});

// ============ Add message to chat ============
chatRoutes.post('/:id/messages', async (c) => {
  const chatId = c.req.param('id');
  const body = await c.req.json<{
    parentId: string | null;
    content: string;
    speakerId: string;
    isBot: boolean;
    createdAt?: number;
  }>();
  
  const id = crypto.randomUUID();
  // Use provided timestamp (e.g., from streaming start) or current time
  const now = body.createdAt ?? Date.now();
  
  transaction(() => {
    // Insert new node
    prepare(`
      INSERT INTO chat_nodes (id, chat_id, parent_id, child_ids, active_child_index, speaker_id, message, is_bot, created_at)
      VALUES (?, ?, ?, '[]', NULL, ?, ?, ?, ?)
    `).run(id, chatId, body.parentId, body.speakerId, body.content, body.isBot ? 1 : 0, now);
    
    // Update parent's child_ids and active_child_index
    if (body.parentId) {
      const parent = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(body.parentId) as NodeRow | null;
      if (parent) {
        const childIds = JSON.parse(parent.child_ids) as string[];
        childIds.push(id);
        prepare('UPDATE chat_nodes SET child_ids = ?, active_child_index = ? WHERE id = ?')
          .run(JSON.stringify(childIds), childIds.length - 1, body.parentId);
      }
    }
    
    // Update chat timestamp
    prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);
  });
  
  invalidateChatCache(chatId);
  
  return c.json({ id, created_at: now }, 201);
});

// ============ Edit message ============
chatRoutes.patch('/:chatId/messages/:nodeId', async (c) => {
  const { chatId, nodeId } = c.req.param();
  const body = await c.req.json<{ content: string }>();
  const now = Date.now();
  
  prepare('UPDATE chat_nodes SET message = ?, updated_at = ? WHERE id = ? AND chat_id = ?')
    .run(body.content, now, nodeId, chatId);
  
  prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);
  
  invalidateChatCache(chatId);
  
  return c.json({ success: true });
});

// ============ Delete message (and descendants) ============
chatRoutes.delete('/:chatId/messages/:nodeId', (c) => {
  const { chatId, nodeId } = c.req.param();
  
  transaction(() => {
    // Get the node to find its parent
    const node = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(nodeId) as NodeRow | null;
    if (!node) return;
    
    // Collect all descendant IDs
    const toDelete: string[] = [nodeId];
    const collectDescendants = (id: string) => {
      const n = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(id) as NodeRow | null;
      if (n) {
        const childIds = JSON.parse(n.child_ids) as string[];
        childIds.forEach(childId => {
          toDelete.push(childId);
          collectDescendants(childId);
        });
      }
    };
    collectDescendants(nodeId);
    
    // Delete all collected nodes
    const placeholders = toDelete.map(() => '?').join(',');
    prepare(`DELETE FROM chat_nodes WHERE id IN (${placeholders})`).run(...toDelete);
    
    // Update parent's child_ids
    if (node.parent_id) {
      const parent = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(node.parent_id) as NodeRow | null;
      if (parent) {
        const childIds = (JSON.parse(parent.child_ids) as string[]).filter(id => id !== nodeId);
        const newActiveIndex = childIds.length > 0 
          ? Math.min(parent.active_child_index ?? 0, childIds.length - 1)
          : null;
        prepare('UPDATE chat_nodes SET child_ids = ?, active_child_index = ? WHERE id = ?')
          .run(JSON.stringify(childIds), newActiveIndex, node.parent_id);
      }
    }
    
    prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(Date.now(), chatId);
  });
  
  invalidateChatCache(chatId);
  
  return c.json({ success: true });
});

// ============ Switch branch ============
chatRoutes.post('/:chatId/switch-branch', async (c) => {
  const { chatId } = c.req.param();
  const body = await c.req.json<{ targetLeafId: string }>();
  
  transaction(() => {
    // Walk up from target and update active_child_index on each parent
    let currentId: string | null = body.targetLeafId;
    
    while (currentId) {
      const node = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(currentId) as NodeRow | null;
      if (!node || !node.parent_id) break;
      
      const parent = prepare<NodeRow>('SELECT * FROM chat_nodes WHERE id = ?').get(node.parent_id) as NodeRow | null;
      if (!parent) break;
      
      const childIds = JSON.parse(parent.child_ids) as string[];
      const childIndex = childIds.indexOf(currentId);
      
      if (childIndex !== -1 && parent.active_child_index !== childIndex) {
        prepare('UPDATE chat_nodes SET active_child_index = ? WHERE id = ?')
          .run(childIndex, node.parent_id);
      }
      
      currentId = node.parent_id;
    }
    
    prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(Date.now(), chatId);
  });
  
  invalidateChatCache(chatId);
  
  return c.json({ success: true });
});
