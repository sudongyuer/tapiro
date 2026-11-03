import { describe, expect, test } from 'bun:test';

import type { NoticePermission } from '@/lib/notifications/types';

import { createPushRegistration } from './pushRegistration';

const TOKEN = 'ExponentPushToken[abc]';

function setup(permission: NoticePermission = 'provisional', token: string | null = TOKEN) {
  const calls: string[] = [];
  let stored: string | null = null;
  let current = permission;
  let failNext = false;
  const push = createPushRegistration({
    permission: async () => current,
    token: async () => token,
    rpc: {
      async register(value, language) {
        calls.push(`register ${value} ${language}`);
        if (failNext) {
          failNext = false;
          throw new Error('offline');
        }
      },
      async setLanguage(language) {
        calls.push(`language ${language}`);
      },
      async unregister(value) {
        calls.push(`unregister ${value}`);
      },
    },
    stored: { get: () => stored, set: (value) => (stored = value) },
  });
  return {
    push,
    calls,
    stored: () => stored,
    allow: (next: NoticePermission) => (current = next),
    failNext: () => (failNext = true),
  };
}

describe('push token registration', () => {
  test('registers once when provisional or allowed, with the app language', async () => {
    const { push, calls, stored } = setup('provisional');
    await push.sync('u1', 'zh-Hans');
    await push.sync('u1', 'zh-Hans');
    expect(calls).toEqual([`register ${TOKEN} zh-Hans`]);
    expect(stored()).toBe(TOKEN);
  });

  test('denied and undetermined store nothing; an answer later registers', async () => {
    const { push, calls, allow } = setup('denied');
    await push.sync('u1', 'en');
    allow('undetermined');
    await push.sync('u1', 'en');
    expect(calls).toEqual([]);
    allow('allowed');
    await push.sync('u1', 'en');
    expect(calls).toEqual([`register ${TOKEN} en`]);
  });

  test('without a token (no EAS project yet) nothing is sent', async () => {
    const { push, calls } = setup('allowed', null);
    await push.sync('u1', 'en');
    expect(calls).toEqual([]);
  });

  test('a language change only updates the language', async () => {
    const { push, calls } = setup('allowed');
    await push.sync('u1', 'zh-Hans');
    await push.sync('u1', 'ms');
    expect(calls).toEqual([`register ${TOKEN} zh-Hans`, 'language ms']);
  });

  test('another user on the same device registers the token again', async () => {
    const { push, calls } = setup('allowed');
    await push.sync('u1', 'en');
    await push.sync('u2', 'en');
    expect(calls).toEqual([`register ${TOKEN} en`, `register ${TOKEN} en`]);
  });

  test('a failed registration is tried again on the next sync', async () => {
    const { push, calls, failNext, stored } = setup('allowed');
    failNext();
    await push.sync('u1', 'en');
    expect(stored()).toBeNull();
    await push.sync('u1', 'en');
    expect(calls).toEqual([`register ${TOKEN} en`, `register ${TOKEN} en`]);
    expect(stored()).toBe(TOKEN);
  });

  test('sign-out unregisters the stored token, even after a restart', async () => {
    const first = setup('allowed');
    await first.push.sync('u1', 'en');
    await first.push.signOut();
    expect(first.calls).toEqual([`register ${TOKEN} en`, `unregister ${TOKEN}`]);
    expect(first.stored()).toBeNull();
    await first.push.signOut();
    expect(first.calls).toHaveLength(2);
  });

  test('a sync still in flight at sign-out does not keep the token', async () => {
    const { push, calls, stored } = setup('allowed');
    const pending = push.sync('u1', 'en');
    await push.signOut();
    await pending;
    expect(calls).toEqual([]);
    expect(stored()).toBeNull();
  });

  test('a deleted account forgets the token without a call', async () => {
    const { push, calls, stored } = setup('allowed');
    await push.sync('u1', 'en');
    push.forget();
    await push.signOut();
    expect(calls).toEqual([`register ${TOKEN} en`]);
    expect(stored()).toBeNull();
  });
});
