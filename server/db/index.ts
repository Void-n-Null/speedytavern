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

  // Profiles can have multiple AI configs; one is "active".
  // Existing DBs won’t have this column; add it safely.
  try {
    db.run('ALTER TABLE profiles ADD COLUMN active_ai_config_id TEXT');
  } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_ai_configs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      name TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      auth_strategy_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      params_json TEXT NOT NULL DEFAULT '{}',
      provider_config_json TEXT NOT NULL DEFAULT '{}',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_profile_ai_configs_profile ON profile_ai_configs(profile_id)');
  
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

  // ============ Character Cards (SillyTavern / Tavern cards) ============
  // Stores the *raw* JSON payload for lossless round-tripping of unknown fields/extensions.
  db.run(`
    CREATE TABLE IF NOT EXISTS character_cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      spec TEXT,
      spec_version TEXT,
      source TEXT NOT NULL DEFAULT 'unknown', /* png_chara | png_ccv3 | json | unknown */
      creator TEXT,
      token_count INTEGER,
      token_count_updated_at INTEGER,
      raw_json TEXT NOT NULL,
      png_blob BLOB,
      png_mime TEXT,
      png_sha256 TEXT,
      png_updated_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Existing DBs won’t have these columns; add them safely.
  try { db.run('ALTER TABLE character_cards ADD COLUMN png_blob BLOB'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN png_mime TEXT'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN png_sha256 TEXT'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN png_updated_at INTEGER'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN creator TEXT'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN token_count INTEGER'); } catch {}
  try { db.run('ALTER TABLE character_cards ADD COLUMN token_count_updated_at INTEGER'); } catch {}

  db.run('CREATE INDEX IF NOT EXISTS idx_character_cards_name ON character_cards(name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_character_cards_spec ON character_cards(spec)');
  db.run('CREATE INDEX IF NOT EXISTS idx_character_cards_png_sha256 ON character_cards(png_sha256)');

  // ============ AI Provider Config / Secrets ============
  // Non-secret provider config (safe to return to UI).
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      provider_id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Encrypted provider secrets (never returned to UI).
  // Composite primary key allows multiple secrets per provider/strategy.
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_provider_secrets (
      provider_id TEXT NOT NULL,
      auth_strategy_id TEXT NOT NULL,
      secret_key TEXT NOT NULL,
      encrypted_value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (provider_id, auth_strategy_id, secret_key)
    )
  `);

  // Connection state (validated credentials, chosen auth strategy, last error).
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_provider_connections (
      provider_id TEXT PRIMARY KEY,
      auth_strategy_id TEXT,
      status TEXT NOT NULL, /* disconnected | connected | error_auth | error_other */
      last_validated_at INTEGER,
      last_error TEXT,
      updated_at INTEGER NOT NULL
    )
  `);

  // PKCE sessions (short-lived). Used to store code_verifier server-side.
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_pkce_sessions (
      state TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      auth_strategy_id TEXT NOT NULL,
      code_verifier TEXT NOT NULL,
      return_url TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
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
