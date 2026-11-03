import { describe, expect, test } from 'bun:test';

import { createExpoToken, TOKEN_TIMEOUT_MS, type TokenSource } from './expoToken';
import { createPushRegistration } from './pushRegistration';

function manualTimers() {
  const pending: { run: () => void; ms: number }[] = [];
  return {
    pending,
    timers: {
      set: (run: () => void, ms: number) => pending.push({ run, ms }) - 1,
      clear: (handle: unknown) => {
        pending[handle as number] = { run: () => undefined, ms: -1 };
      },
    },
    fire: () => pending.splice(0).forEach((timer) => timer.run()),
  };
}

const never = <T>() => new Promise<T>(() => {});
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Expo push token', () => {
  test('without an EAS project there is no token and no call', async () => {
    let calls = 0;
    const read = createExpoToken({
      projectId: () => null,
      device: async () => {
        calls += 1;
        return { data: 'device' };
      },
      expo: async () => ({ data: 'ExponentPushToken[x]' }),
    });
    expect(await read()).toBeNull();
    expect(calls).toBe(0);
  });

  test('the Expo token is fetched once per device token', async () => {
    let expoCalls = 0;
    const source: TokenSource = {
      projectId: () => 'p1',
      device: async () => ({ data: 'device-1' }),
      expo: async () => {
        expoCalls += 1;
        return { data: 'ExponentPushToken[a]' };
      },
    };
    const read = createExpoToken(source);
    expect(await read()).toBe('ExponentPushToken[a]');
    expect(await read()).toBe('ExponentPushToken[a]');
    expect(expoCalls).toBe(1);
  });

  test('a device-token fetch that never settles times out, and the queue and sign-out go on', async () => {
    const clock = manualTimers();
    const read = createExpoToken(
      { projectId: () => 'p1', device: never, expo: never },
      clock.timers,
    );
    const calls: string[] = [];
    let stored: string | null = 'ExponentPushToken[old]';
    const push = createPushRegistration({
      permission: async () => 'allowed',
      token: read,
      rpc: {
        register: async (token) => {
          calls.push(`register ${token}`);
        },
        unregister: async (token) => {
          calls.push(`unregister ${token}`);
        },
      },
      stored: { get: () => stored, set: (value) => (stored = value) },
    });
    const syncing = push.sync('u1', 'en');
    await settle();
    expect(clock.pending.map((timer) => timer.ms)).toEqual([TOKEN_TIMEOUT_MS]);
    clock.fire();
    await syncing;
    await push.signOut();
    expect(calls).toEqual(['unregister ExponentPushToken[old]']);
  });
});
