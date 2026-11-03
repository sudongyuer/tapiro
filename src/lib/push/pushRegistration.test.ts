import { describe, expect, test } from 'bun:test';

import type { NoticePermission } from '@/lib/notifications/types';

import { createPushRegistration } from './pushRegistration';

const TOKEN = 'ExponentPushToken[abc]';

function setup(permission: NoticePermission = 'provisional', token: string | null = TOKEN) {
  const calls: string[] = [];
  let stored: string | null = null;
  let current = permission;
  let failNext = false;
  let hold: Promise<void> | null = null;
  const push = createPushRegistration({
    permission: async () => current,
    token: async () => token,
    rpc: {
      async register(value, language) {
        calls.push(`register ${value} ${language}`);
        if (hold) await hold;
        calls.push('registered');
        if (failNext) {
          failNext = false;
          throw new Error('offline');
        }
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
    holdRegister() {
      let release = () => {};
      hold = new Promise((resolve) => (release = resolve));
      return () => {
        hold = null;
        release();
      };
    },
  };
}

const sent = (calls: string[]) => calls.filter((call) => call !== 'registered');

describe('push token registration', () => {
  test('registers once when provisional or allowed, with the app language', async () => {
    const { push, calls, stored } = setup('provisional');
    await push.sync('u1', 'zh-Hans');
    await push.sync('u1', 'zh-Hans');
    expect(sent(calls)).toEqual([`register ${TOKEN} zh-Hans`]);
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
    expect(sent(calls)).toEqual([`register ${TOKEN} en`]);
  });

  test('without a token (no EAS project yet) nothing is sent', async () => {
    const { push, calls } = setup('allowed', null);
    await push.sync('u1', 'en');
    expect(calls).toEqual([]);
  });

  test('a language change registers this device again with the new language only', async () => {
    const { push, calls } = setup('allowed');
    await push.sync('u1', 'zh-Hans');
    await push.sync('u1', 'ms');
    expect(sent(calls)).toEqual([`register ${TOKEN} zh-Hans`, `register ${TOKEN} ms`]);
  });

  test('another user on the same device registers the token again', async () => {
    const { push, calls } = setup('allowed');
    await push.sync('u1', 'en');
    await push.sync('u2', 'en');
    expect(sent(calls)).toEqual([`register ${TOKEN} en`, `register ${TOKEN} en`]);
  });

  test('a failed registration is tried again on the next sync', async () => {
    const { push, calls, failNext } = setup('allowed');
    failNext();
    await push.sync('u1', 'en');
    await push.sync('u1', 'en');
    expect(sent(calls)).toEqual([`register ${TOKEN} en`, `register ${TOKEN} en`]);
  });

  test('sign-out unregisters the stored token, even after a restart', async () => {
    const first = setup('allowed');
    await first.push.sync('u1', 'en');
    await first.push.signOut();
    expect(sent(first.calls)).toEqual([`register ${TOKEN} en`, `unregister ${TOKEN}`]);
    expect(first.stored()).toBeNull();
    await first.push.signOut();
    expect(sent(first.calls)).toHaveLength(2);
  });

  test('a sync that has not reached the server at sign-out sends nothing', async () => {
    const { push, calls, stored } = setup('allowed');
    const pending = push.sync('u1', 'en');
    await push.signOut();
    await pending;
    expect(calls).toEqual([]);
    expect(stored()).toBeNull();
  });

  test('a registration still in flight at sign-out is unregistered after it lands', async () => {
    const { push, calls, holdRegister } = setup('allowed');
    const release = holdRegister();
    void push.sync('u1', 'en');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([`register ${TOKEN} en`]);
    const signingOut = push.signOut();
    release();
    await signingOut;
    expect(calls).toEqual([`register ${TOKEN} en`, 'registered', `unregister ${TOKEN}`]);
  });

  test('once the sign-out wait has expired, a late registration is not unregistered', async () => {
    const { push, calls, holdRegister, stored } = setup('allowed');
    const release = holdRegister();
    void push.sync('u1', 'en');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const wait = { expired: false };
    const signingOut = push.signOut(wait);
    wait.expired = true;
    release();
    await signingOut;
    expect(calls).toEqual([`register ${TOKEN} en`, 'registered']);
    expect(stored()).toBeNull();
  });

  test('a deleted account forgets the token without a call', async () => {
    const { push, calls, stored } = setup('allowed');
    await push.sync('u1', 'en');
    push.forget();
    await push.signOut();
    expect(sent(calls)).toEqual([`register ${TOKEN} en`]);
    expect(stored()).toBeNull();
  });
});
