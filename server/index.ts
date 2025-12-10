import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { initDb, closeDb } from './db';
import { chatRoutes } from './routes/chats';
import { settingsRoutes } from './routes/settings';
import { speakerRoutes } from './routes/speakers';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Routes
app.route('/api/chats', chatRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/speakers', speakerRoutes);

// Initialize database and start server
const port = Number(process.env.PORT) || 3001;

initDb();

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
