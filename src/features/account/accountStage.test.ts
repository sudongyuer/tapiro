import { describe, expect, test } from 'bun:test';

import { accountStage } from './accountStage';
import { fixtureUser } from './fixtureAuthService';

const user = fixtureUser('apple');

describe('accountStage', () => {
  test('follows the session until signed in', () => {
    expect(accountStage({ status: 'loading' }, new Set())).toBe('loading');
    expect(accountStage({ status: 'signedOut' }, new Set([user.id]))).toBe('signedOut');
  });

  test('a signed-in user onboards once', () => {
    expect(accountStage({ status: 'signedIn', user }, new Set())).toBe('onboarding');
    expect(accountStage({ status: 'signedIn', user }, new Set([user.id]))).toBe('ready');
    expect(accountStage({ status: 'signedIn', user }, new Set(['someone-else']))).toBe(
      'onboarding',
    );
  });
});
