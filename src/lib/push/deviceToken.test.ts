import { describe, expect, test } from 'bun:test';

import {
  apnsEnvironment,
  createDeviceToken,
  TOKEN_TIMEOUT_MS,
  type ApsEntitlement,
  type TokenSource,
} from './deviceToken';
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
const HEX = 'AB12'.repeat(16);

const source = (data: unknown, entitlement: ApsEntitlement, development = false): TokenSource => ({
  device: async () => ({ data }),
  entitlement: async () => entitlement,
  development,
});

describe('APNs device token', () => {
  test('the native token is read lowercase with the environment of its aps entitlement', async () => {
    expect(await createDeviceToken(source(HEX, 'development'))()).toEqual({
      token: HEX.toLowerCase(),
      environment: 'sandbox',
    });
    expect(await createDeviceToken(source(HEX, 'production'))()).toEqual({
      token: HEX.toLowerCase(),
      environment: 'production',
    });
  });

  test.each([
    ['development', false, 'sandbox'],
    ['production', true, 'production'],
    [null, false, 'production'],
    [null, true, 'sandbox'],
  ] as const)(
    'entitlement %s in a development build %s goes to %s',
    (entitlement, development, expected) => {
      expect(apnsEnvironment(entitlement, development)).toBe(expected);
    },
  );

  test('an entitlement read that fails falls back to the build kind', async () => {
    const read = createDeviceToken({
      device: async () => ({ data: HEX }),
      entitlement: () => Promise.reject(new Error('no profile')),
      development: false,
    });
    expect(await read()).toEqual({ token: HEX.toLowerCase(), environment: 'production' });
  });

  test('anything but a hex APNs token is not registered', async () => {
    expect(await createDeviceToken(source('ExponentPushToken[a]', 'production'))()).toBeNull();
    expect(await createDeviceToken(source({ endpoint: 'web' }, 'production'))()).toBeNull();
    expect(await createDeviceToken(source('ab', 'production'))()).toBeNull();
  });

  test('a device-token fetch that never settles times out, and the queue and sign-out go on', async () => {
    const clock = manualTimers();
    const read = createDeviceToken(
      { device: never, entitlement: never, development: false },
      clock.timers,
    );
    const calls: string[] = [];
    let stored: string | null = 'f0'.repeat(32);
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
    expect(calls).toEqual([`unregister ${'f0'.repeat(32)}`]);
  });
});
