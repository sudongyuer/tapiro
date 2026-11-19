import { describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

import { localSupabase } from '../../../scripts/local-supabase';

const client = createClient(localSupabase('API_URL'), localSupabase('ANON_KEY'), {
  auth: { persistSession: false },
});

// The first Apple attempt fetches Apple's signing keys from inside the auth container, which took about 6 s.
const JWKS_FETCH_TIMEOUT_MS = 30_000;

const unsigned = (claims: Record<string, unknown>) =>
  [{ alg: 'RS256', typ: 'JWT' }, claims]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .concat('c2lnbmF0dXJl')
    .join('.');

describe('native ID-token providers (local stack)', () => {
  test.each([
    ['apple', 'https://appleid.apple.com', 'app.tapiro'],
    ['google', 'https://accounts.google.com', 'web.apps.googleusercontent.com'],
  ] as const)(
    '%s is enabled, and an unsigned token is still refused',
    async (provider, iss, aud) => {
      const now = Math.floor(Date.now() / 1000);
      const { data, error } = await client.auth.signInWithIdToken({
        provider,
        token: unsigned({ iss, aud, sub: 'forged', iat: now, exp: now + 600 }),
      });
      expect(data.session).toBeNull();
      expect({ status: error?.status, message: error?.message }).toEqual({
        status: 400,
        message: 'Bad ID token',
      });
    },
    JWKS_FETCH_TIMEOUT_MS,
  );
});
