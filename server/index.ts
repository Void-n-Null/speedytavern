import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initDb, closeDb } from './db';
import { chatRoutes } from './routes/chats';
import { settingsRoutes } from './routes/settings';
import { speakerRoutes } from './routes/speakers';
import { profileRoutes, seedDefaultProfileIfEmpty } from './routes/profiles';
import designTemplateRoutes from './routes/designTemplates';
import { fontRoutes } from './routes/fonts';
import { seedDemoDataIfEmpty } from './seed';

const app = new Hono();

// Store the default chat ID after seeding
let defaultChatId: string | null = null;

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Get default chat ID (seeded on startup)
app.get('/api/default-chat', (c) => {
  if (!defaultChatId) {
    return c.json({ error: 'No default chat available' }, 404);
  }
  return c.json({ id: defaultChatId });
});

// Routes
app.route('/api/chats', chatRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/speakers', speakerRoutes);
app.route('/api/profiles', profileRoutes);
app.route('/api/design-templates', designTemplateRoutes);
app.route('/api/fonts', fontRoutes);

// Initialize database and start server
const port = Number(process.env.PORT) || 3001;

initDb();
seedDefaultProfileIfEmpty();
defaultChatId = seedDemoDataIfEmpty();

console.log(`🚀 Server running at http://localhost:${port}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDb();
  process.exit(0);
});

export default {
  port,
  fetch: app.fetch,
};
