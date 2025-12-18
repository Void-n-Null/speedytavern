import { Hono } from 'hono';
import {
  getRequestLogs,
  getCostSummary,
  getCostByModel,
  getDailyCostTrend,
  getErrorLogs,
  deleteOldLogs,
} from '../ai/requestLogger';

export const aiRequestLogsRoutes = new Hono();

// Get paginated request logs
aiRequestLogsRoutes.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const providerId = c.req.query('providerId') || undefined;
  const modelSlug = c.req.query('modelSlug') || undefined;
  const status = c.req.query('status') as 'success' | 'error' | undefined;
  const startDate = c.req.query('startDate') ? parseInt(c.req.query('startDate')!) : undefined;
  const endDate = c.req.query('endDate') ? parseInt(c.req.query('endDate')!) : undefined;

  const result = getRequestLogs({
    limit,
    offset,
    providerId,
    modelSlug,
    status,
    startDate,
    endDate,
  });

  return c.json(result);
});

// Get cost summary
aiRequestLogsRoutes.get('/summary', async (c) => {
  const providerId = c.req.query('providerId') || undefined;
  const startDate = c.req.query('startDate') ? parseInt(c.req.query('startDate')!) : undefined;
  const endDate = c.req.query('endDate') ? parseInt(c.req.query('endDate')!) : undefined;

  const summary = getCostSummary({ providerId, startDate, endDate });
  return c.json(summary);
});

// Get cost breakdown by model
aiRequestLogsRoutes.get('/by-model', async (c) => {
  const providerId = c.req.query('providerId') || undefined;
  const startDate = c.req.query('startDate') ? parseInt(c.req.query('startDate')!) : undefined;
  const endDate = c.req.query('endDate') ? parseInt(c.req.query('endDate')!) : undefined;
  const limit = parseInt(c.req.query('limit') || '20');

  const breakdown = getCostByModel({ providerId, startDate, endDate, limit });
  return c.json(breakdown);
});

// Get daily cost trend
aiRequestLogsRoutes.get('/trend', async (c) => {
  const providerId = c.req.query('providerId') || undefined;
  const days = parseInt(c.req.query('days') || '30');

  const trend = getDailyCostTrend({ providerId, days });
  return c.json(trend);
});

// Get error logs
aiRequestLogsRoutes.get('/errors', async (c) => {
  const providerId = c.req.query('providerId') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');

  const errors = getErrorLogs({ providerId, limit });
  return c.json(errors);
});

// Delete old logs (admin cleanup)
aiRequestLogsRoutes.delete('/cleanup', async (c) => {
  const days = parseInt(c.req.query('days') || '90');
  const deleted = deleteOldLogs(days);
  return c.json({ deleted, message: `Deleted ${deleted} logs older than ${days} days` });
});

