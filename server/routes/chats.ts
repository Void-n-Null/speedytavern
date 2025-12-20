import { Hono } from 'hono';
import { prepare, transaction } from '../db';
import {
  getCachedChat,
  setCachedChat,
  invalidateChatCache,
  getCachedSpeaker,
  type CachedChat,
} from '../cache';
import type { ChatNode, Speaker } from '../../src/types/chat';

export const chatRoutes = new Hono();

// Types for DB rows
interface ChatRow {
  id: string;
  name: string;
  character_ids: string; // JSON array
  persona_id: string | null;
  tags: string; // JSON array
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
    SELECT id, name, character_ids, persona_id, tags, created_at, updated_at 
    FROM chats 
    ORDER BY updated_at DESC
  `).all() as ChatRow[];
  
  return c.json(chats.map(row => ({
    id: row.id,
    name: row.name,
    character_ids: JSON.parse(row.character_ids),
    persona_id: row.persona_id,
    tags: JSON.parse(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  })));
});

interface SpeakerRow {
  id: string;
  name: string;
  avatar_url: string | null;
  color: string | null;
  is_user: number;
}

// Helper to convert nodes to compact wire format (dictionary-encoded speaker_id)
// Also fetches and includes the relevant speakers
function toWireFormat(nodes: ChatNode[]) {
  // Build speaker dictionary from unique speaker_ids
  const speakerSet = new Set<string>();
  for (const node of nodes) {
    speakerSet.add(node.speaker_id);
  }
  const speakerIds = Array.from(speakerSet);
  
  // Fetch speaker data (check cache first, then DB)
  const speakers: Speaker[] = [];
  const missingIds: string[] = [];
  
  for (const id of speakerIds) {
    const cached = getCachedSpeaker(id);
    if (cached) {
      speakers.push(cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const placeholders = missingIds.map(() => '?').join(',');
    const rows = prepare<SpeakerRow>(`SELECT * FROM speakers WHERE id IN (${placeholders})`).all(...missingIds) as SpeakerRow[];
    
    for (const row of rows) {
      speakers.push({
        id: row.id,
        name: row.name,
        avatar_url: row.avatar_url ?? undefined,
        color: row.color ?? undefined,
        is_user: Boolean(row.is_user),
      });
    }
  }
  
  // IMPORTANT: Also include a user speaker if one doesn't exist in the messages yet.
  // This allows the user to send their first message before any user messages exist.
  const hasUserSpeaker = speakers.some(s => s.is_user);
  if (!hasUserSpeaker) {
    // Find any user speaker in the database
    const userRow = prepare<SpeakerRow>('SELECT * FROM speakers WHERE is_user = 1 LIMIT 1').get() as SpeakerRow | null;
    if (userRow) {
      const userSpeaker: Speaker = {
        id: userRow.id,
        name: userRow.name,
        avatar_url: userRow.avatar_url ?? undefined,
        color: userRow.color ?? undefined,
        is_user: true,
      };
      speakers.push(userSpeaker);
      speakerIds.push(userRow.id);
    }
  }
  
  // Re-sort speakers to match speakerIds order (important for wire format consistency)
  const speakerIndex = new Map(speakerIds.map((id, i) => [id, i]));
  const speakersMap = new Map(speakers.map(s => [s.id, s]));
  const sortedSpeakers = speakerIds.map(id => speakersMap.get(id) || { id, name: 'Unknown', is_user: false });
  
  // Convert nodes to compact format
  const wireNodes = nodes.map(n => ({
    id: n.id,
    parent_id: n.parent_id,
    child_ids: n.child_ids,
    active_child_index: n.active_child_index,
    s: speakerIndex.get(n.speaker_id)!, // index instead of full UUID
    message: n.message,
    is_bot: n.is_bot,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }));
  
  return { speakerIds, speakers: sortedSpeakers, nodes: wireNodes };
}

// ============ Get single chat with all nodes ============
chatRoutes.get('/:id', (c) => {
  const chatId = c.req.param('id');
  
  // Check cache first
  let cached = getCachedChat(chatId);
  if (cached) {
    const { speakerIds, speakers, nodes: wireNodes } = toWireFormat(Array.from(cached.nodes.values()));
    return c.json({
      id: cached.id,
      name: cached.name,
      character_ids: cached.characterIds,
      persona_id: cached.personaId,
      tags: cached.tags,
      speakerIds,
      speakers,
      nodes: wireNodes,
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
  
  const characterIds = JSON.parse(chat.character_ids);
  const tags = JSON.parse(chat.tags);

  // Cache it
  cached = {
    id: chat.id,
    name: chat.name,
    characterIds,
    personaId: chat.persona_id,
    tags,
    nodes,
    rootId,
    tailId,
    lastAccess: Date.now(),
  };
  setCachedChat(cached);
  
  // Return compact wire format with speakers
  const { speakerIds, speakers, nodes: wireNodes } = toWireFormat(Array.from(nodes.values()));
  return c.json({
    id: chat.id,
    name: chat.name,
    character_ids: characterIds,
    persona_id: chat.persona_id,
    tags,
    speakerIds,
    speakers,
    nodes: wireNodes,
    rootId,
    tailId,
  });
});

// ============ Create new chat ============
chatRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    name: string;
    character_ids?: string[];
    persona_id?: string;
    tags?: string[];
  }>();
  
  const id = crypto.randomUUID();
  const now = Date.now();
  const charIds = JSON.stringify(body.character_ids || []);
  const tags = JSON.stringify(body.tags || []);
  
  prepare(`
    INSERT INTO chats (id, name, character_ids, persona_id, tags, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, 
    body.name, 
    charIds, 
    body.persona_id ?? null, 
    tags, 
    now, 
    now
  );
  
  return c.json({
    id,
    name: body.name,
    character_ids: body.character_ids || [],
    persona_id: body.persona_id || null,
    tags: body.tags || [],
    created_at: now,
    updated_at: now
  }, 201);
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
    id?: string;
    parentId: string | null;
    content: string;
    speakerId: string;
    isBot: boolean;
    createdAt?: number;
  }>();
  
  // Allow client-provided IDs for frontend-authoritative creation.
  // This avoids temp->real ID replacement churn on the client.
  let id: string;
  if (typeof body.id === 'string' && body.id.length > 0) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(body.id)) {
      return c.json({ error: 'Invalid message id (must be UUID)' }, 400);
    }

    // Ensure global uniqueness (chat_nodes.id is PRIMARY KEY).
    const existing = prepare<{ id: string }>('SELECT id FROM chat_nodes WHERE id = ?').get(body.id) as { id: string } | null;
    if (existing) {
      return c.json({ error: 'Message id already exists' }, 409);
    }

    id = body.id;
  } else {
    id = crypto.randomUUID();
  }
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
    
    // Delete all collected nodes using a recursive CTE to find descendants
    prepare(`
      DELETE FROM chat_nodes 
      WHERE id IN (
        WITH RECURSIVE descendants(id) AS (
          SELECT ?
          UNION ALL
          SELECT cn.id FROM chat_nodes cn JOIN descendants d ON cn.parent_id = d.id
        )
        SELECT id FROM descendants
      )
    `).run(nodeId);
    
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
