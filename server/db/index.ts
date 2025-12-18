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
      character_ids TEXT NOT NULL DEFAULT '[]',
      persona_id TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
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
  
  // 1. Ensure columns exist in chats
  const chatCols = db.query("PRAGMA table_info(chats)").all() as any[];
  const requiredChatCols = [
    { name: 'character_ids', type: 'TEXT', default: "'[]'" },
    { name: 'persona_id', type: 'TEXT' },
    { name: 'tags', type: 'TEXT', default: "'[]'" }
  ];
  for (const col of requiredChatCols) {
    if (!chatCols.some(c => c.name === col.name)) {
      const def = col.default ? ` DEFAULT ${col.default}` : '';
      db.run(`ALTER TABLE chats ADD COLUMN ${col.name} ${col.type}${def}`);
      console.log(`🔧 Added ${col.name} to chats`);
    }
  }

  // 2. Ensure 'active_ai_config_id' exists in profiles
  const profileCols = db.query("PRAGMA table_info(profiles)").all() as any[];
  if (!profileCols.some(c => c.name === 'active_ai_config_id')) {
    db.run('ALTER TABLE profiles ADD COLUMN active_ai_config_id TEXT');
    console.log('🔧 Added active_ai_config_id to profiles');
  }

  // 2. Ensure all columns exist in character_cards
  const cardCols = db.query("PRAGMA table_info(character_cards)").all() as any[];
  const requiredCardCols = [
    { name: 'png_blob', type: 'BLOB' },
    { name: 'png_mime', type: 'TEXT' },
    { name: 'png_sha256', type: 'TEXT' },
    { name: 'png_updated_at', type: 'INTEGER' },
    { name: 'creator', type: 'TEXT' },
    { name: 'token_count', type: 'INTEGER' },
    { name: 'token_count_updated_at', type: 'INTEGER' }
  ];

  for (const col of requiredCardCols) {
    if (!cardCols.some(c => c.name === col.name)) {
      db.run(`ALTER TABLE character_cards ADD COLUMN ${col.name} ${col.type}`);
      console.log(`🔧 Added ${col.name} to character_cards`);
    }
  }

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

  // AI request logs for cost tracking and telemetry
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_slug TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      calculated_cost_usd REAL,
      latency_ms INTEGER,
      status TEXT NOT NULL,
      error_message TEXT,
      request_metadata TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_ai_request_logs_created ON ai_request_logs(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_request_logs_model ON ai_request_logs(model_slug)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_request_logs_provider ON ai_request_logs(provider_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ai_request_logs_status ON ai_request_logs(status)');
  
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
