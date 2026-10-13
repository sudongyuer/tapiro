import { describe, expect, test } from 'bun:test';

import { createFixtureAuthService } from './fixtureAuthService';
import { safeSignIn } from './safeSignIn';
import type { AuthService } from './types';

describe('safeSignIn', () => {
  test('passes through the service result', async () => {
    expect(await safeSignIn(createFixtureAuthService(), 'apple')).toEqual({ ok: true });
  });

  test('maps a thrown sign-in to failed', async () => {
    const throwing: AuthService = {
      ...createFixtureAuthService(),
      signIn: async () => {
        throw new Error('native module missing');
      },
    };
    expect(await safeSignIn(throwing, 'google')).toEqual({ ok: false, reason: 'failed' });
  });
});
