import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { localDb } from '../../../scripts/local-db';
import { localSupabase } from '../../../scripts/local-supabase';
import { CRON_SECRET_HEADER } from '../_shared/cronSecret';
import { TEST_APNS_HEADER, TEST_KEY_ID, TEST_TEAM_ID } from '../notify/config';

const MOCK_PORT = 54399;
const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const LIVE = 'a1'.repeat(32);
const GONE = 'de'.repeat(32);

type Seen = { path: string; headers: Headers; body: unknown };
const seen: Seen[] = [];

const mock = Bun.serve({
  port: MOCK_PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    const path = new URL(req.url).pathname;
    seen.push({ path, headers: req.headers, body: await req.json() });
    if (path.endsWith(GONE)) return Response.json({ reason: 'Unregistered' }, { status: 410 });
    return new Response(null, { status: 200 });
  },
});

function localEnvValue(key: string) {
  const file = readFileSync(new URL('../local.env', import.meta.url), 'utf8');
  const line = file.split('\n').find((entry) => entry.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} missing from local.env`);
  return line.slice(key.length + 1).trim();
}

async function testPublicKey() {
  const der = Uint8Array.from(atob(localEnvValue('APNS_TEST_PRIVATE_KEY')), (char) =>
    char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', key);
  return crypto.subtle.importKey(
    'jwk',
    { kty, crv, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
}

const decode = (part: string) =>
  Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));

let userId = '';
let eventId = 0;
const subjectId = crypto.randomUUID();

async function queueDuePush() {
  const later = new Date(Date.now() + 2 * 24 * 3600 * 1000);
  later.setUTCHours(4, 0, 0, 0);
  const [event] = await localDb()`
    insert into public.events (recipient, kind, subject_id, push, created_at)
    values (${userId}, 'bounty.selected', ${subjectId}, true, ${later})
    returning id`;
  eventId = Number(event.id);
  const due =
    await localDb()`update public.push_queue set send_at = now() where event_id = ${eventId}`;
  if (due.count !== 1) throw new Error('the event queued no push');
}

describe('notify through APNs (local stack, mock APNs)', () => {
  beforeAll(async () => {
    const email = `apns-${crypto.randomUUID()}@example.test`;
    const password = `pw-${crypto.randomUUID()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user.id;
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    for (const [token, environment] of [
      [GONE, 'production'],
      [LIVE.toUpperCase(), 'sandbox'],
    ]) {
      const { error } = await client.rpc('register_push_token', {
        token,
        language: 'en',
        environment,
      });
      if (error) throw error;
    }
    await queueDuePush();
  });

  afterAll(async () => {
    mock.stop(true);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test('signs with ES256, posts to each token environment with the data under body, and drops a gone token', async () => {
    const res = await fetch(`${url}/functions/v1/notify`, {
      method: 'POST',
      headers: { [CRON_SECRET_HEADER]: localEnvValue('CRON_SECRET'), [TEST_APNS_HEADER]: '1' },
    });
    expect(res.status).toBe(200);

    const live = seen.find((request) => request.path === `/sandbox/3/device/${LIVE}`);
    const gone = seen.find((request) => request.path === `/production/3/device/${GONE}`);
    expect(gone).toBeDefined();
    expect(live).toBeDefined();
    expect(live!.headers.get('apns-topic')).toBe('app.tapiro');
    expect(live!.headers.get('apns-push-type')).toBe('alert');
    expect(live!.body).toEqual({
      aps: {
        alert: { title: 'Bounty', body: 'Someone chose you to help' },
        sound: 'default',
        'thread-id': `bounty:${subjectId}`,
      },
      body: { kind: 'bounty.selected', id: subjectId },
    });

    const jwt = live!.headers.get('authorization')!.replace(/^bearer /, '');
    const [header, claims, signature] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(decode(header)))).toEqual({
      alg: 'ES256',
      kid: TEST_KEY_ID,
    });
    expect(JSON.parse(new TextDecoder().decode(decode(claims))).iss).toBe(TEST_TEAM_ID);
    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await testPublicKey(),
      decode(signature),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(verified).toBe(true);

    const [queued] = await localDb()`
      select sent_at, failed_at from public.push_queue where event_id = ${eventId}`;
    expect(queued.sent_at).not.toBeNull();
    expect(queued.failed_at).toBeNull();
    const tokens = await localDb()`select token from public.push_tokens where user_id = ${userId}`;
    expect([...tokens]).toEqual([{ token: LIVE }]);
  });
});
