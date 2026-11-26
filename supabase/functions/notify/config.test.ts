import { describe, expect, test } from 'bun:test';

import { LOCAL_ENV } from '../_shared/iap/fakes.ts';
import {
  liveSender,
  localTestSender,
  senderFor,
  TEST_APNS_HEADER,
  unconfiguredSender,
} from './config.ts';
import type { ApnsSenders, LiveActivityPush } from './apns.ts';
import type { OutgoingPush, PushSender } from './handler.ts';

const envOf = (values: Record<string, string>) => (key: string) => values[key];

async function pkcs8() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
  ]);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let binary = '';
  for (const byte of der) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const push: OutgoingPush = {
  queueId: 1,
  language: 'en',
  message: {
    to: 'aa',
    environment: 'production',
    title: 'T',
    body: 'B',
    threadId: 'bounty:b',
    sound: 'default',
    data: { kind: 'bounty.selected', id: 'b' },
  },
};

const marker = (name: string): PushSender => ({
  send: async (pushes) => pushes.map(() => ({ ok: false, error: name })),
});

const senders = (name: string): ApnsSenders => ({
  pushes: marker(name),
  liveActivities: { send: async (pushes) => pushes.map(() => ({ ok: false, error: name })) },
});

const liveActivity: LiveActivityPush = {
  to: 'bb',
  environment: 'sandbox',
  priority: 5,
  payload: { aps: { event: 'update' } },
};

describe('notify sender config', () => {
  test('without the three APNs secrets there is no live sender', async () => {
    expect(await liveSender(envOf({ APNS_KEY_ID: 'K', APNS_TEAM_ID: 'T' }))).toBeNull();
  });

  test('a key that does not import fails every push as apns_bad_key instead of recording it', async () => {
    const sender = await liveSender(
      envOf({ APNS_KEY_ID: 'K', APNS_TEAM_ID: 'T', APNS_PRIVATE_KEY: 'not a key' }),
    );
    expect(await sender!.pushes.send([push])).toEqual([{ ok: false, error: 'apns_bad_key' }]);
    expect(await sender!.liveActivities.send([liveActivity])).toEqual([
      { ok: false, error: 'apns_bad_key' },
    ]);
  });

  test('unconfigured: the local stack records, anywhere else every push fails as apns_not_configured', async () => {
    const recording = marker('recorded');
    const local = unconfiguredSender(envOf(LOCAL_ENV), recording);
    expect(await local.pushes.send([push])).toEqual([{ ok: false, error: 'recorded' }]);
    expect(await local.liveActivities.send([liveActivity])).toEqual([
      { ok: false, error: 'apns_not_configured' },
    ]);
    const hosted = { ...LOCAL_ENV, SUPABASE_URL: 'https://wkpgoildusumtejzhtkv.supabase.co' };
    expect(await unconfiguredSender(envOf(hosted), recording).pushes.send([push])).toEqual([
      { ok: false, error: 'apns_not_configured' },
    ]);
  });

  test('the mock APNs sender exists only on the local stack with the flag, origin and key', async () => {
    const key = await pkcs8();
    const local = {
      ...LOCAL_ENV,
      APNS_ALLOW_TEST: '1',
      APNS_TEST_ORIGIN: 'http://mock',
      APNS_TEST_PRIVATE_KEY: key,
    };
    expect(await localTestSender(envOf(local))).not.toBeNull();
    expect(await localTestSender(envOf({ ...local, APNS_ALLOW_TEST: '' }))).toBeNull();
    expect(await localTestSender(envOf({ ...local, SB_REGION: 'ap-southeast-1' }))).toBeNull();
  });

  test('only a request with the test header uses the test sender', () => {
    const configured = senders('configured');
    const mock = senders('mock');
    const plain = new Request('http://localhost/notify', { method: 'POST' });
    const flagged = new Request('http://localhost/notify', {
      method: 'POST',
      headers: { [TEST_APNS_HEADER]: '1' },
    });
    expect(senderFor(plain, configured, mock)).toBe(configured);
    expect(senderFor(flagged, configured, mock)).toBe(mock);
    expect(senderFor(flagged, configured, null)).toBe(configured);
  });
});
