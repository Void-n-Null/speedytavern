/**
 * AI Request Logger Service
 * 
 * Tracks all AI requests with cost calculations, token counts, and latency.
 * Used for cost analytics and debugging.
 */

import { prepare, transaction } from '../db';

export interface AiRequestLog {
  id: string;
  provider_id: string;
  model_slug: string;
  input_tokens: number | null;
  output_tokens: number | null;
  calculated_cost_usd: number | null;
  latency_ms: number | null;
  status: 'success' | 'error';
  error_message: string | null;
  request_metadata: Record<string, unknown> | null;
  created_at: number;
}

export interface LogRequestParams {
  providerId: string;
  modelSlug: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Price per token (not per million) */
  inputPricePerToken?: number;
  outputPricePerToken?: number;
  latencyMs?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface CostSummary {
  totalCostUsd: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgCostPerRequest: number;
  avgLatencyMs: number;
}

export interface ModelCostBreakdown {
  modelSlug: string;
  totalCostUsd: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface DailyCostTrend {
  date: string; // YYYY-MM-DD
  totalCostUsd: number;
  requestCount: number;
}

// ============ Logging Functions ============

/**
 * Log an AI request with cost calculation
 */
export function logAiRequest(params: LogRequestParams): string {
  const id = crypto.randomUUID();
  const now = Date.now();

  // Calculate cost if pricing info provided
  let calculatedCost: number | null = null;
  if (params.inputPricePerToken !== undefined && params.outputPricePerToken !== undefined) {
    const inputCost = (params.inputTokens || 0) * params.inputPricePerToken;
    const outputCost = (params.outputTokens || 0) * params.outputPricePerToken;
    calculatedCost = inputCost + outputCost;
  }

  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

  prepare(`
    INSERT INTO ai_request_logs (
      id, provider_id, model_slug, input_tokens, output_tokens,
      calculated_cost_usd, latency_ms, status, error_message,
      request_metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.providerId,
    params.modelSlug,
    params.inputTokens ?? null,
    params.outputTokens ?? null,
    calculatedCost,
    params.latencyMs ?? null,
    params.status,
    params.errorMessage ?? null,
    metadataJson,
    now
  );

  return id;
}

/**
 * Update an existing log entry (e.g., when streaming completes)
 */
export function updateAiRequestLog(
  id: string,
  updates: {
    outputTokens?: number;
    inputTokens?: number;
    calculatedCostUsd?: number;
    latencyMs?: number;
    status?: 'success' | 'error';
    errorMessage?: string;
  }
): void {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.outputTokens !== undefined) {
    setClauses.push('output_tokens = ?');
    values.push(updates.outputTokens);
  }
  if (updates.inputTokens !== undefined) {
    setClauses.push('input_tokens = ?');
    values.push(updates.inputTokens);
  }
  if (updates.calculatedCostUsd !== undefined) {
    setClauses.push('calculated_cost_usd = ?');
    values.push(updates.calculatedCostUsd);
  }
  if (updates.latencyMs !== undefined) {
    setClauses.push('latency_ms = ?');
    values.push(updates.latencyMs);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push('error_message = ?');
    values.push(updates.errorMessage);
  }

  if (setClauses.length === 0) return;

  values.push(id);
  prepare(`UPDATE ai_request_logs SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
}

// ============ Query Functions ============

interface LogRow {
  id: string;
  provider_id: string;
  model_slug: string;
  input_tokens: number | null;
  output_tokens: number | null;
  calculated_cost_usd: number | null;
  latency_ms: number | null;
  status: string;
  error_message: string | null;
  request_metadata: string | null;
  created_at: number;
}

/**
 * Get paginated request logs with optional filters
 */
export function getRequestLogs(options: {
  limit?: number;
  offset?: number;
  providerId?: string;
  modelSlug?: string;
  status?: 'success' | 'error';
  startDate?: number;
  endDate?: number;
}): { logs: AiRequestLog[]; total: number } {
  const whereClauses: string[] = [];
  const values: unknown[] = [];

  if (options.providerId) {
    whereClauses.push('provider_id = ?');
    values.push(options.providerId);
  }
  if (options.modelSlug) {
    whereClauses.push('model_slug = ?');
    values.push(options.modelSlug);
  }
  if (options.status) {
    whereClauses.push('status = ?');
    values.push(options.status);
  }
  if (options.startDate) {
    whereClauses.push('created_at >= ?');
    values.push(options.startDate);
  }
  if (options.endDate) {
    whereClauses.push('created_at <= ?');
    values.push(options.endDate);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Get total count
  const countRow = prepare(`SELECT COUNT(*) as count FROM ai_request_logs ${whereClause}`).get(...values) as { count: number };
  const total = countRow.count;

  // Get paginated results
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const rows = prepare(`
    SELECT * FROM ai_request_logs 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as LogRow[];

  const logs: AiRequestLog[] = rows.map(row => ({
    id: row.id,
    provider_id: row.provider_id,
    model_slug: row.model_slug,
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    calculated_cost_usd: row.calculated_cost_usd,
    latency_ms: row.latency_ms,
    status: row.status as 'success' | 'error',
    error_message: row.error_message,
    request_metadata: row.request_metadata ? JSON.parse(row.request_metadata) : null,
    created_at: row.created_at,
  }));

  return { logs, total };
}

/**
 * Get cost summary for a time period
 */
export function getCostSummary(options: {
  providerId?: string;
  startDate?: number;
  endDate?: number;
}): CostSummary {
  const whereClauses: string[] = ["status = 'success'"];
  const values: unknown[] = [];

  if (options.providerId) {
    whereClauses.push('provider_id = ?');
    values.push(options.providerId);
  }
  if (options.startDate) {
    whereClauses.push('created_at >= ?');
    values.push(options.startDate);
  }
  if (options.endDate) {
    whereClauses.push('created_at <= ?');
    values.push(options.endDate);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const row = prepare(`
    SELECT 
      COALESCE(SUM(calculated_cost_usd), 0) as total_cost,
      COUNT(*) as total_requests,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COALESCE(AVG(latency_ms), 0) as avg_latency
    FROM ai_request_logs
    ${whereClause}
  `).get(...values) as {
    total_cost: number;
    total_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
    avg_latency: number;
  };

  return {
    totalCostUsd: row.total_cost,
    totalRequests: row.total_requests,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
    avgCostPerRequest: row.total_requests > 0 ? row.total_cost / row.total_requests : 0,
    avgLatencyMs: row.avg_latency,
  };
}

/**
 * Get cost breakdown by model
 */
export function getCostByModel(options: {
  providerId?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}): ModelCostBreakdown[] {
  const whereClauses: string[] = ["status = 'success'"];
  const values: unknown[] = [];

  if (options.providerId) {
    whereClauses.push('provider_id = ?');
    values.push(options.providerId);
  }
  if (options.startDate) {
    whereClauses.push('created_at >= ?');
    values.push(options.startDate);
  }
  if (options.endDate) {
    whereClauses.push('created_at <= ?');
    values.push(options.endDate);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limit = options.limit ?? 20;

  const rows = prepare(`
    SELECT 
      model_slug,
      COALESCE(SUM(calculated_cost_usd), 0) as total_cost,
      COUNT(*) as request_count,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens
    FROM ai_request_logs
    ${whereClause}
    GROUP BY model_slug
    ORDER BY total_cost DESC
    LIMIT ?
  `).all(...values, limit) as {
    model_slug: string;
    total_cost: number;
    request_count: number;
    total_input_tokens: number;
    total_output_tokens: number;
  }[];

  return rows.map(row => ({
    modelSlug: row.model_slug,
    totalCostUsd: row.total_cost,
    requestCount: row.request_count,
    totalInputTokens: row.total_input_tokens,
    totalOutputTokens: row.total_output_tokens,
  }));
}

/**
 * Get daily cost trend
 */
export function getDailyCostTrend(options: {
  providerId?: string;
  days?: number;
}): DailyCostTrend[] {
  const days = options.days ?? 30;
  const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);

  const whereClauses: string[] = ["status = 'success'", 'created_at >= ?'];
  const values: unknown[] = [startDate];

  if (options.providerId) {
    whereClauses.push('provider_id = ?');
    values.push(options.providerId);
  }

  const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

  // SQLite date function to group by day
  const rows = prepare(`
    SELECT 
      date(created_at / 1000, 'unixepoch') as date,
      COALESCE(SUM(calculated_cost_usd), 0) as total_cost,
      COUNT(*) as request_count
    FROM ai_request_logs
    ${whereClause}
    GROUP BY date(created_at / 1000, 'unixepoch')
    ORDER BY date ASC
  `).all(...values) as {
    date: string;
    total_cost: number;
    request_count: number;
  }[];

  return rows.map(row => ({
    date: row.date,
    totalCostUsd: row.total_cost,
    requestCount: row.request_count,
  }));
}

/**
 * Get error logs
 */
export function getErrorLogs(options: {
  limit?: number;
  providerId?: string;
}): AiRequestLog[] {
  const whereClauses: string[] = ["status = 'error'"];
  const values: unknown[] = [];

  if (options.providerId) {
    whereClauses.push('provider_id = ?');
    values.push(options.providerId);
  }

  const whereClause = `WHERE ${whereClauses.join(' AND ')}`;
  const limit = options.limit ?? 50;

  const rows = prepare(`
    SELECT * FROM ai_request_logs 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ?
  `).all(...values, limit) as LogRow[];

  return rows.map(row => ({
    id: row.id,
    provider_id: row.provider_id,
    model_slug: row.model_slug,
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    calculated_cost_usd: row.calculated_cost_usd,
    latency_ms: row.latency_ms,
    status: row.status as 'success' | 'error',
    error_message: row.error_message,
    request_metadata: row.request_metadata ? JSON.parse(row.request_metadata) : null,
    created_at: row.created_at,
  }));
}

/**
 * Delete old logs (cleanup)
 */
export function deleteOldLogs(olderThanDays: number): number {
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  const result = prepare('DELETE FROM ai_request_logs WHERE created_at < ?').run(cutoff);
  return result.changes;
}

