export const API_BASE = '/api';

/**
 * Generic API fetcher.
 */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  return res.json();
}

/**
 * DELETE helper that treats 404 as success.
 *
 * We intentionally make deletes idempotent to avoid races like:
 * "delete requested before create finished" → 404 → optimistic rollback → phantom rows.
 */
export async function apiDelete(path: string, options: RequestInit = {}): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  // Idempotent delete: already gone is fine.
  if (res.status === 404) {
    return { success: true };
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }

  // Some DELETE endpoints may respond 204 No Content.
  return res.json().catch(() => ({ success: true }));
}


