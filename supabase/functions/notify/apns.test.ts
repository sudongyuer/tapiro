import { describe, expect, test } from 'bun:test';

import { APNS_ORIGINS, apnsSender, importApnsKey, type ApnsConfig } from './apns.ts';
import type { ApnsEnvironment, OutgoingPush } from './handler.ts';

const TOKEN = 'a1'.repeat(32);

async function testKey() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let binary = '';
  for (const byte of der) binary += String.fromCharCode(byte);
  const lines = btoa(binary)
    .match(/.{1,64}/g)!
    .join('\n');
  return {
    pem: `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`,
    publicKey: pair.publicKey,
  };
}

const decode = (part: string) =>
  Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

const push = (to: string, environment: ApnsEnvironment): OutgoingPush => ({
  queueId: 1,
  language: 'en',
  message: {
    to,
    environment,
    title: '帮取快递',
    body: 'Alice chose you to help',
    threadId: 'bounty:b1',
    sound: 'default',
    data: { kind: 'bounty.selected', id: 'b1' },
  },
});

type Seen = { url: string; headers: Headers; body: unknown };

async function harness(
  answer: (url: string) => Response = () => new Response(null, { status: 200 }),
) {
  const { pem, publicKey } = await testKey();
  const seen: Seen[] = [];
  let clock = Date.UTC(2026, 10, 20, 12, 7);
  const config: ApnsConfig = {
    keyId: 'KEY1234567',
    teamId: 'TEAM123456',
    key: await importApnsKey(pem),
    topic: 'app.tapiro',
    origins: APNS_ORIGINS,
    now: () => clock,
    fetch: (async (url: string, init: RequestInit) => {
      seen.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
      return answer(url);
    }) as typeof fetch,
  };
  return { sender: apnsSender(config), seen, publicKey, tick: (ms: number) => (clock += ms) };
}

const jwtOf = (seen: Seen) => seen.headers.get('authorization')!.replace(/^bearer /, '');

describe('apnsSender', () => {
  test('posts an alert to the host of each token environment with the data under body', async () => {
    const { sender, seen } = await harness();
    const results = await sender.send([
      push(TOKEN, 'production'),
      push('b2'.repeat(32), 'sandbox'),
    ]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(seen.map((request) => request.url)).toEqual([
      `https://api.push.apple.com/3/device/${TOKEN}`,
      `https://api.sandbox.push.apple.com/3/device/${'b2'.repeat(32)}`,
    ]);
    expect(seen[0].headers.get('apns-topic')).toBe('app.tapiro');
    expect(seen[0].headers.get('apns-push-type')).toBe('alert');
    expect(seen[0].headers.get('apns-priority')).toBe('10');
    expect(seen[0].body).toEqual({
      aps: {
        alert: { title: '帮取快递', body: 'Alice chose you to help' },
        sound: 'default',
        'thread-id': 'bounty:b1',
      },
      body: { kind: 'bounty.selected', id: 'b1' },
    });
  });

  test('signs an ES256 provider token that verifies with the public key', async () => {
    const { sender, seen, publicKey } = await harness();
    await sender.send([push(TOKEN, 'production')]);
    const [header, claims, signature] = jwtOf(seen[0]).split('.');
    expect(JSON.parse(new TextDecoder().decode(decode(header)))).toEqual({
      alg: 'ES256',
      kid: 'KEY1234567',
    });
    expect(JSON.parse(new TextDecoder().decode(decode(claims)))).toEqual({
      iss: 'TEAM123456',
      iat: Date.UTC(2026, 10, 20, 12) / 1000,
    });
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      decode(signature),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(valid).toBe(true);
  });

  test('reuses the provider token within its 30-minute window, then signs the next window', async () => {
    const { sender, seen, tick } = await harness();
    await sender.send([push(TOKEN, 'production')]);
    tick(20 * 60 * 1000);
    await sender.send([push(TOKEN, 'production')]);
    tick(5 * 60 * 1000);
    await sender.send([push(TOKEN, 'production')]);
    const tokens = seen.map(jwtOf);
    const iat = (token: string) =>
      JSON.parse(new TextDecoder().decode(decode(token.split('.')[1]))).iat;
    expect(tokens[1]).toBe(tokens[0]);
    expect(iat(tokens[2])).toBe(Date.UTC(2026, 10, 20, 12, 30) / 1000);
  });

  test('isolates started at different times in one window sign the same iat', async () => {
    const first = await harness();
    const second = await harness();
    second.tick(15 * 60 * 1000);
    await first.sender.send([push(TOKEN, 'production')]);
    await second.sender.send([push(TOKEN, 'production')]);
    const iat = (seen: Seen) =>
      JSON.parse(new TextDecoder().decode(decode(jwtOf(seen).split('.')[1]))).iat;
    expect(iat(first.seen[0])).toBe(iat(second.seen[0]));
  });

  test('a gone token is reported unregistered so notify drops it; a wrong-environment one stays an error', async () => {
    const reasons: Record<string, Response> = {
      a: Response.json({ reason: 'Unregistered' }, { status: 410 }),
      b: Response.json({ reason: 'BadDeviceToken' }, { status: 400 }),
      c: Response.json({ reason: 'DeviceTokenNotForTopic' }, { status: 400 }),
      d: Response.json({ reason: 'TooManyRequests' }, { status: 429 }),
    };
    const { sender } = await harness((url) => reasons[url.slice(-1)]);
    const results = await sender.send(['a', 'b', 'c', 'd'].map((to) => push(to, 'production')));
    expect(results).toEqual([
      { ok: false, error: 'Unregistered' },
      { ok: false, error: 'apns_400_BadDeviceToken' },
      { ok: false, error: 'Unregistered' },
      { ok: false, error: 'apns_429_TooManyRequests' },
    ]);
  });

  test('a network failure fails only that push', async () => {
    const { pem } = await testKey();
    const sender = apnsSender({
      keyId: 'K',
      teamId: 'T',
      key: await importApnsKey(pem),
      topic: 'app.tapiro',
      origins: APNS_ORIGINS,
      fetch: (async (url: string) => {
        if (url.endsWith('down')) throw new TypeError('connection reset');
        return new Response(null, { status: 200 });
      }) as typeof fetch,
    });
    expect(await sender.send([push('down', 'sandbox'), push(TOKEN, 'sandbox')])).toEqual([
      { ok: false, error: 'apns_unreachable' },
      { ok: true },
    ]);
  });

  test('a key pasted with escaped newlines imports', async () => {
    const { pem } = await testKey();
    await expect(importApnsKey(pem.replace(/\n/g, '\\n'))).resolves.toBeDefined();
  });
});
