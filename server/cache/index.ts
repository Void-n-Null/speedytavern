/**
 * In-memory cache with write-through to SQLite.
 * Optimized for hot chat data access.
 */

import type { ChatNode, Speaker } from '../../src/types/chat';

export interface CachedChat {
  id: string;
  name: string;
  nodes: Map<string, ChatNode>;
  rootId: string | null;
  tailId: string | null;
  lastAccess: number;
}

interface Cache {
  // Active chats in memory
  chats: Map<string, CachedChat>;
  
  // Speakers (usually small, keep all in memory)
  speakers: Map<string, Speaker>;
  
  // Settings
  settings: Map<string, unknown>;
}

const cache: Cache = {
  chats: new Map(),
  speakers: new Map(),
  settings: new Map(),
};

// LRU eviction config
const MAX_CACHED_CHATS = 10;

// ============ Chat Cache ============

export function getCachedChat(chatId: string): CachedChat | undefined {
  const cached = cache.chats.get(chatId);
  if (cached) {
    cached.lastAccess = Date.now();
  }
  return cached;
}

export function setCachedChat(chat: CachedChat): void {
  // LRU eviction if at capacity
  if (cache.chats.size >= MAX_CACHED_CHATS && !cache.chats.has(chat.id)) {
    evictLRUChat();
  }
  
  chat.lastAccess = Date.now();
  cache.chats.set(chat.id, chat);
}

export function invalidateChatCache(chatId: string): void {
  cache.chats.delete(chatId);
}

export function invalidateAllChatCache(): void {
  cache.chats.clear();
}

function evictLRUChat(): void {
  let oldest: { id: string; time: number } | null = null;
  
  for (const [id, chat] of cache.chats) {
    if (!oldest || chat.lastAccess < oldest.time) {
      oldest = { id, time: chat.lastAccess };
    }
  }
  
  if (oldest) {
    cache.chats.delete(oldest.id);
  }
}

// ============ Speaker Cache ============

export function getCachedSpeaker(speakerId: string): Speaker | undefined {
  return cache.speakers.get(speakerId);
}

export function getAllCachedSpeakers(): Speaker[] {
  return Array.from(cache.speakers.values());
}

export function setCachedSpeaker(speaker: Speaker): void {
  cache.speakers.set(speaker.id, speaker);
}

export function setCachedSpeakers(speakers: Speaker[]): void {
  cache.speakers.clear();
  speakers.forEach(s => cache.speakers.set(s.id, s));
}

export function invalidateSpeakerCache(speakerId?: string): void {
  if (speakerId) {
    cache.speakers.delete(speakerId);
  } else {
    cache.speakers.clear();
  }
}

// ============ Settings Cache ============

export function getCachedSetting<T>(key: string): T | undefined {
  return cache.settings.get(key) as T | undefined;
}

export function setCachedSetting(key: string, value: unknown): void {
  cache.settings.set(key, value);
}

export function invalidateSettingsCache(key?: string): void {
  if (key) {
    cache.settings.delete(key);
  } else {
    cache.settings.clear();
  }
}

// ============ Stats ============

export function getCacheStats() {
  return {
    cachedChats: cache.chats.size,
    cachedSpeakers: cache.speakers.size,
    cachedSettings: cache.settings.size,
  };
}
