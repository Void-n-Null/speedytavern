import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const DB_PATH = join(DATA_DIR, 'tavernstudio.db');

let db: Database;

// Prepared statements cache
const statements = new Map<string, ReturnType<Database['prepare']>>();

export function initDb(): Database {
  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory at', DATA_DIR);
  }
  
  console.log('📦 Opening database at', DB_PATH);
  db = new Database(DB_PATH, { create: true });
  
  // WAL mode for concurrent reads + faster writes
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA cache_size = 10000');
  db.run('PRAGMA temp_store = MEMORY');
  db.run('PRAGMA mmap_size = 268435456'); // 256MB memory-mapped I/O
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_nodes (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      parent_id TEXT,
      child_ids TEXT NOT NULL DEFAULT '[]',
      active_child_index INTEGER,
      speaker_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_bot INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS speakers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT,
      color TEXT,
      is_user INTEGER NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      message_style TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS design_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS fonts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      format TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  
  // Indexes for fast lookups
  db.run('CREATE INDEX IF NOT EXISTS idx_nodes_chat ON chat_nodes(chat_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_nodes_parent ON chat_nodes(parent_id)');
  
  console.log('📦 Database initialized at', DB_PATH);
  
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

// Prepared statement helper - caches and reuses statements
export function prepare<T = unknown>(sql: string): ReturnType<Database['prepare']> {
  let stmt = statements.get(sql);
  if (!stmt) {
    stmt = getDb().prepare(sql);
    statements.set(sql, stmt);
  }
  return stmt;
}

export function closeDb(): void {
  if (db) {
    // Clear prepared statements
    statements.clear();
    db.close();
    console.log('📦 Database closed');
  }
}

// Transaction helper for batch operations
export function transaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}
