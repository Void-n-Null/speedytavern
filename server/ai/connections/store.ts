import { prepare } from '../../db';

export type ConnectionStatus = 'disconnected' | 'connected' | 'error_auth' | 'error_other';

export type ProviderConnectionRow = {
  provider_id: string;
  auth_strategy_id: string | null;
  status: ConnectionStatus;
  last_validated_at: number | null;
  last_error: string | null;
  updated_at: number;
};

export function getProviderConnection(providerId: string): ProviderConnectionRow | null {
  const row = prepare<ProviderConnectionRow>(`
    SELECT * FROM ai_provider_connections WHERE provider_id = ?
  `).get(providerId) as ProviderConnectionRow | null;
  return row ?? null;
}

export function upsertProviderConnection(
  providerId: string,
  patch: Partial<Omit<ProviderConnectionRow, 'provider_id'>> & { status: ConnectionStatus }
): void {
  const now = Date.now();
  prepare(`
    INSERT INTO ai_provider_connections (provider_id, auth_strategy_id, status, last_validated_at, last_error, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_id) DO UPDATE SET
      auth_strategy_id = excluded.auth_strategy_id,
      status = excluded.status,
      last_validated_at = excluded.last_validated_at,
      last_error = excluded.last_error,
      updated_at = excluded.updated_at
  `).run(
    providerId,
    patch.auth_strategy_id ?? null,
    patch.status,
    patch.last_validated_at ?? null,
    patch.last_error ?? null,
    now
  );
}

export function markDisconnected(providerId: string, reason: string | null = null): void {
  upsertProviderConnection(providerId, {
    auth_strategy_id: null,
    status: 'disconnected',
    last_validated_at: null,
    last_error: reason,
  });
}








