/**
 * Seeds the database with demo data if no chats exist.
 */
import { prepare, transaction } from './db';
import type { ChatNode } from '../src/types/chat';

const userMessages = [
  "Hey, how's it going?",
  "That's interesting, tell me more.",
  "What do you think about that?",
  "I see what you mean.",
  "Can you explain further?",
  "That makes sense.",
  "What happens next?",
  "I'm curious about that.",
  "Go on...",
  "Really? That's surprising.",
];

const botMessages = [
  "I'm doing well, thank you for asking! The magical energies in the glade are particularly vibrant today.",
  "Of course! The ancient forests hold many secrets. Each tree whispers tales of ages past.",
  "Well, I believe that every moment holds potential for wonder. Even the smallest creature carries magic.",
  "The connection between all living things is what sustains the balance. It's delicate, but beautiful.",
  "Certainly. When the moon rises full, the veil between worlds grows thin. That's when the true magic happens.",
  "I sense curiosity in you - that's a gift. Never lose that spark of wonder.",
  "The path forward isn't always clear, but trust your instincts. They'll guide you true.",
  "There's an old saying among my kind: 'The light finds those who seek it.'",
  "I could tell you stories that would take a thousand nights. Where shall I begin?",
  "Indeed! The world is full of surprises for those who keep their eyes open.",
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface SpeakerRow {
  id: string;
  name: string;
  is_user: number;
  color: string | null;
  avatar_url: string | null;
}

export function seedDemoDataIfEmpty(): string | null {
  // Check if any chats exist
  const existingChats = prepare<{ count: number }>('SELECT COUNT(*) as count FROM chats').get() as { count: number };
  
  if (existingChats.count > 0) {
    // Return the first chat ID
    const firstChat = prepare<{ id: string }>('SELECT id FROM chats ORDER BY created_at ASC LIMIT 1').get() as { id: string };
    console.log('📚 Found existing chat:', firstChat.id);
    return firstChat.id;
  }
  
  console.log('🌱 Seeding demo data...');
  
  const chatId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const botId = crypto.randomUUID();
  const now = Date.now();
  
  transaction(() => {
    // Create chat
    prepare('INSERT INTO chats (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(chatId, 'Demo Chat', now, now);
    
    // Create speakers with avatar URLs
    prepare('INSERT INTO speakers (id, name, is_user, color, avatar_url) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'User', 1, '#3498db', 'https://api.dicebear.com/7.x/avataaars/svg?seed=user');
    prepare('INSERT INTO speakers (id, name, is_user, color, avatar_url) VALUES (?, ?, ?, ?, ?)')
      .run(botId, 'Seraphina', 0, '#9b59b6', 'https://api.dicebear.com/7.x/avataaars/svg?seed=seraphina');
    
    // Build nodes in memory first
    const nodes: ChatNode[] = [];
    const nodeMap = new Map<string, ChatNode>();
    
    const createNode = (parentId: string | null, content: string, speakerId: string, isBot: boolean): string => {
      const id = crypto.randomUUID();
      const node: ChatNode = {
        id,
        parent_id: parentId,
        child_ids: [],
        active_child_index: null,
        speaker_id: speakerId,
        message: content,
        is_bot: isBot,
        created_at: now + nodes.length, // Ensure order
      };
      nodes.push(node);
      nodeMap.set(id, node);
      
      if (parentId) {
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent.active_child_index = parent.child_ids.length;
          parent.child_ids.push(id);
        }
      }
      
      return id;
    };
    
    // Generate 200 messages alternating between user and bot
    let parentId: string | null = null;
    let branchPointId: string | null = null;
    
    for (let i = 0; i < 200; i++) {
      const isUser = i % 2 === 0;
      const content = pickRandom(isUser ? userMessages : botMessages);
      const speakerId = isUser ? userId : botId;
      
      // Save branch point at message 189
      if (i === 189) {
        branchPointId = parentId;
      }
      
      parentId = createNode(parentId, content, speakerId, !isUser);
    }
    
    // Create alternate branch with 100 messages at position 190
    if (branchPointId) {
      let altParentId = branchPointId;
      
      altParentId = createNode(
        altParentId,
        "🌟 [ALTERNATE TIMELINE] The story takes a different turn here...",
        botId,
        true
      );
      
      for (let i = 0; i < 99; i++) {
        const isUser = i % 2 === 0;
        const content = `[Alt ${i + 2}] ${pickRandom(isUser ? userMessages : botMessages)}`;
        const speakerId = isUser ? userId : botId;
        
        altParentId = createNode(altParentId, content, speakerId, !isUser);
      }
      
      // Set main branch as active (index 0) at branch point
      const branchPointNode = nodeMap.get(branchPointId);
      if (branchPointNode) {
        branchPointNode.active_child_index = 0;
      }
    }
    
    // Insert all nodes to DB
    const insertNode = prepare(`
      INSERT INTO chat_nodes (id, chat_id, parent_id, child_ids, active_child_index, speaker_id, message, is_bot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const node of nodes) {
      insertNode.run(
        node.id,
        chatId,
        node.parent_id,
        JSON.stringify(node.child_ids),
        node.active_child_index,
        node.speaker_id,
        node.message,
        node.is_bot ? 1 : 0,
        node.created_at
      );
    }
  });
  
  console.log('✅ Seeded demo chat with 300 nodes');
  return chatId;
}
