import { createHash, randomBytes } from 'node:crypto';
import { prepare } from '../../db';
import { setProviderSecret } from '../secrets/store';
import { connectProvider } from '../connections/manager';

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function sha256Base64Url(input: string): string {
  const hash = createHash('sha256').update(input).digest();
  return base64UrlEncode(hash);
}

export type PkceStartResult = {
  authUrl: string;
  state: string;
};

type PkceSessionRow = {
  state: string;
  provider_id: string;
  auth_strategy_id: string;
  code_verifier: string;
  return_url: string;
  created_at: number;
  expires_at: number;
};

export function startOpenRouterPkce(opts: { callbackUrl: string; returnUrl: string }): PkceStartResult {
  const state = crypto.randomUUID();
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = sha256Base64Url(codeVerifier);

  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  // Best-effort cleanup of expired sessions.
  prepare('DELETE FROM ai_pkce_sessions WHERE expires_at < ?').run(now);

  prepare(`
    INSERT INTO ai_pkce_sessions (state, provider_id, auth_strategy_id, code_verifier, return_url, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(state, 'openrouter', 'pkce', codeVerifier, opts.returnUrl, now, expiresAt);

  // We embed state into our callback URL (OpenRouter redirects back with ?code=...).
  const callbackWithState = new URL(opts.callbackUrl);
  callbackWithState.searchParams.set('state', state);

  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('callback_url', callbackWithState.toString());
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return { authUrl: authUrl.toString(), state };
}

export async function finishOpenRouterPkce(code: string, state: string): Promise<{ ok: true } | { ok: false; error: string; returnUrl: string }> {
  const row = prepare<PkceSessionRow>('SELECT * FROM ai_pkce_sessions WHERE state = ?').get(state) as PkceSessionRow | null;
  if (!row) {
    return { ok: false, error: 'PKCE session not found (expired or invalid state)', returnUrl: 'http://localhost:5173' };
  }

  const now = Date.now();
  if (row.expires_at < now) {
    prepare('DELETE FROM ai_pkce_sessions WHERE state = ?').run(state);
    return { ok: false, error: 'PKCE session expired', returnUrl: row.return_url };
  }

  // Exchange auth code → API key (OpenRouter-specific).
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: row.code_verifier,
        code_challenge_method: 'S256',
      }),
    });

    const json = await res.json().catch(() => null) as any;
    if (!res.ok) {
      const msg = (json && (json.error || json.message)) ? String(json.error || json.message) : `HTTP ${res.status}`;
      return { ok: false, error: `OpenRouter exchange failed: ${msg}`, returnUrl: row.return_url };
    }

    const key = json?.key;
    if (typeof key !== 'string' || !key) {
      return { ok: false, error: 'OpenRouter exchange returned no key', returnUrl: row.return_url };
    }

    // Store encrypted API key under the pkce auth strategy.
    setProviderSecret('openrouter', 'pkce', 'apiKey', key);

    // Validate + cache connection immediately so user can confirm it works.
    await connectProvider('openrouter', 'pkce');

    prepare('DELETE FROM ai_pkce_sessions WHERE state = ?').run(state);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      returnUrl: row.return_url,
    };
  }
}

export function getPkceReturnUrl(state: string): string {
  const row = prepare<PkceSessionRow>('SELECT * FROM ai_pkce_sessions WHERE state = ?').get(state) as PkceSessionRow | null;
  return row?.return_url ?? 'http://localhost:5173';
}








