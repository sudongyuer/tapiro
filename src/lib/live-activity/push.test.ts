import { describe, expect, test } from 'bun:test';

import { createLiveActivityPush, type LiveActivityDevice, type LiveActivityPushDeps } from './push';

const KEY = 'ab'.repeat(32);
const START = 'cd'.repeat(40);

function harness(overrides: Partial<LiveActivityPushDeps> = {}) {
  const registered: LiveActivityDevice[] = [];
  const unregistered: string[] = [];
  let flushes = 0;
  let style: { timeZone: string; clock: 'h23' | 'h12' } = {
    timeZone: 'Asia/Kuala_Lumpur',
    clock: 'h23',
  };
  const deps: LiveActivityPushDeps = {
    endpoint: () => ({ url: 'https://example.supabase.co', anonKey: 'anon' }),
    setUp: async () => ({ deviceKey: KEY, startToken: START }),
    environment: async () => 'production',
    style: () => style,
    register: async (device) => {
      registered.push(device);
    },
    unregister: async (key) => {
      unregistered.push(key);
    },
    flush: async () => {
      flushes += 1;
    },
    ...overrides,
  };
  return {
    push: createLiveActivityPush(deps),
    registered,
    unregistered,
    get flushes() {
      return flushes;
    },
    setStyle: (next: typeof style) => (style = next),
  };
}

describe('live activity device registration', () => {
  test('registers the device key, start token, language, environment, time zone and clock once', async () => {
    const run = harness();
    await run.push.sync('u1', 'en');
    await run.push.sync('u1', 'en');
    expect(run.registered).toEqual([
      {
        deviceKey: KEY,
        startToken: START,
        language: 'en',
        environment: 'production',
        timeZone: 'Asia/Kuala_Lumpur',
        clock: 'h23',
      },
    ]);
  });

  test('registers again when the language, time zone, start token or account changes', async () => {
    const run = harness();
    await run.push.sync('u1', 'en');
    await run.push.sync('u1', 'ms');
    run.setStyle({ timeZone: 'Asia/Shanghai', clock: 'h12' });
    await run.push.sync('u1', 'ms');
    await run.push.sync('u1', 'ms', 'ef'.repeat(40));
    await run.push.sync('u2', 'ms', 'ef'.repeat(40));
    expect(
      run.registered.map((device) => [device.language, device.timeZone, device.startToken]),
    ).toEqual([
      ['en', 'Asia/Kuala_Lumpur', START],
      ['ms', 'Asia/Kuala_Lumpur', START],
      ['ms', 'Asia/Shanghai', START],
      ['ms', 'Asia/Shanghai', 'ef'.repeat(40)],
      ['ms', 'Asia/Shanghai', 'ef'.repeat(40)],
    ]);
  });

  test('a device without a start token yet (Live Activities off) still registers, so its activities can attach', async () => {
    const run = harness({ setUp: async () => ({ deviceKey: KEY }) });
    await run.push.sync('u1', 'zh-Hans');
    expect(run.registered[0].startToken).toBeNull();
  });

  test('nothing is registered without a backend or a device key', async () => {
    const noBackend = harness({ endpoint: () => null });
    await noBackend.push.sync('u1', 'en');
    const noKey = harness({ setUp: async () => ({}) });
    await noKey.push.sync('u1', 'en');
    expect([...noBackend.registered, ...noKey.registered]).toEqual([]);
  });

  test('sign out removes the device row, even after a relaunch that never synced', async () => {
    const run = harness();
    await run.push.signOut();
    expect(run.unregistered).toEqual([KEY]);
    await run.push.sync('u1', 'en');
    await run.push.signOut();
    expect(run.unregistered).toEqual([KEY, KEY]);
    await run.push.sync('u1', 'en');
    expect(run.registered).toHaveLength(2);
  });

  test('a sync in flight at sign out is removed again and not kept as registered', async () => {
    let release: () => void = () => undefined;
    const run = harness({
      register: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const syncing = run.push.sync('u1', 'en');
    await Bun.sleep(0);
    const signingOut = run.push.signOut();
    release();
    await Promise.all([syncing, signingOut]);
    expect(run.unregistered).toEqual([KEY]);
    expect(run.flushes).toBe(0);
  });

  test('after every sync the kit resends tokens it could not attach before the device existed', async () => {
    const run = harness();
    await run.push.sync('u1', 'en');
    await run.push.sync('u1', 'en');
    expect(run.registered).toHaveLength(1);
    expect(run.flushes).toBe(2);
  });
});
