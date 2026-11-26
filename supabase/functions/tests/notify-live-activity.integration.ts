import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { localDb } from '../../../scripts/local-db';
import { localSupabase } from '../../../scripts/local-supabase';
import { CRON_SECRET_HEADER } from '../_shared/cronSecret';
import { TEST_APNS_HEADER } from '../notify/config';

const MOCK_PORT = 54399;
const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEVICE_KEY = crypto
  .getRandomValues(new Uint8Array(32))
  .reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '');
const START = 'a7'.repeat(40);
const ACTIVITY = 'b8'.repeat(40);
const bountyId = crypto.randomUUID();
const link = `tapiro://bounty/status/${bountyId}`;

type Seen = { path: string; headers: Headers; body: { aps: Record<string, unknown> } };
const seen: Seen[] = [];

const mock = Bun.serve({
  port: MOCK_PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    seen.push({ path: new URL(req.url).pathname, headers: req.headers, body: await req.json() });
    return new Response(null, { status: 200 });
  },
});

function localEnvValue(key: string) {
  const file = readFileSync(new URL('../local.env', import.meta.url), 'utf8');
  const line = file.split('\n').find((entry) => entry.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} missing from local.env`);
  return line.slice(key.length + 1).trim();
}

async function signedIn(name: string) {
  const email = `la-${name}-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.error) throw created.error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: created.data.user.id, client };
}

async function rpc(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const { error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
}

// The event triggers poke notify without the test header; that run cannot reach APNs and records nothing, so the
// test queues the work again and runs notify against the mock itself.
async function runNotify(owner: string) {
  await Bun.sleep(1500);
  await localDb()`
    insert into public.live_activity_due (user_id, urgent) values (${owner}, true)
    on conflict (user_id) do update set version = public.live_activity_due.version + 1, urgent = true,
      claimed_at = null, attempts = 0`;
  seen.length = 0;
  const res = await fetch(`${url}/functions/v1/notify`, {
    method: 'POST',
    headers: { [CRON_SECRET_HEADER]: localEnvValue('CRON_SECRET'), [TEST_APNS_HEADER]: '1' },
  });
  expect(res.status).toBe(200);
  return seen.filter((request) => request.headers.get('apns-push-type') === 'liveactivity');
}

let poster: Awaited<ReturnType<typeof signedIn>>;
let helper: Awaited<ReturnType<typeof signedIn>>;

describe('notify drives Live Activities through APNs (local stack, mock APNs)', () => {
  beforeAll(async () => {
    poster = await signedIn('Alice');
    helper = await signedIn('Lily');
    await localDb()`
      insert into public.coin_ledger (user_id, reason, delta) values (${poster.id}, 'help_settled', 1)`;
    await localDb()`
      insert into public.payee_methods (user_id, type) values (${poster.id}, 'cash'), (${helper.id}, 'cash')`;
    await rpc(poster.client, 'register_live_activity_device', {
      device_key: DEVICE_KEY,
      start_token: START,
      language: 'en',
      environment: 'sandbox',
      time_zone: 'Asia/Kuala_Lumpur',
      clock: 'h23',
    });
    await rpc(poster.client, 'publish_bounty', {
      id: bountyId,
      title: 'Pick up a parcel',
      category: 'pickup',
      art: null,
      reward_minor: 500,
      reward_currency: 'MYR',
      description: null,
      place_label: 'KL Sentral',
      latitude: 3.134,
      longitude: 101.686,
      address: 'Block C',
      starts_at: null,
      ends_at: null,
      deadline_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    });
    await rpc(helper.client, 'apply_to_bounty', { bounty: bountyId });
    await rpc(poster.client, 'select_helper', { bounty: bountyId, applicant: helper.id });
    await rpc(helper.client, 'start_bounty', {
      bounty: bountyId,
      eta: new Date(Date.now() + 6 * 60_000).toISOString(),
    });
  });

  afterAll(async () => {
    mock.stop(true);
    for (const user of [poster, helper]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test("the helper setting off push-starts the poster's Live Activity on the liveactivity topic", async () => {
    const [start] = await runNotify(poster.id);
    expect(start.path).toBe(`/sandbox/3/device/${START}`);
    expect(start.headers.get('apns-topic')).toBe('app.tapiro.push-type.liveactivity');
    expect(start.headers.get('apns-priority')).toBe('10');
    expect(start.body.aps.event).toBe('start');
    expect(start.body.aps['attributes-type']).toBe('TapiroActivityAttributes');
    expect(start.body.aps.attributes).toEqual({ kind: 'bounty', link });
    expect((start.body.aps['content-state'] as { title: string }).title).toBe(
      'Lily · about 6 min away',
    );
    const [started] = await localDb()`
      select count(*)::int as n from public.live_activity_started where user_id = ${poster.id} and link = ${link}`;
    expect(started.n).toBe(1);
  });

  test('the token the kit attaches without a session receives the update, and completion ends it', async () => {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    await rpc(anon, 'attach_live_activity_token', {
      device_key: DEVICE_KEY,
      token: ACTIVITY,
      link,
    });

    const [update] = await runNotify(poster.id);
    expect(update.path).toBe(`/sandbox/3/device/${ACTIVITY}`);
    expect(update.body.aps.event).toBe('update');
    expect(typeof update.body.aps['stale-date']).toBe('number');

    await rpc(helper.client, 'complete_bounty', { bounty: bountyId });
    const [end] = await runNotify(poster.id);
    expect(end.path).toBe(`/sandbox/3/device/${ACTIVITY}`);
    expect(end.body.aps.event).toBe('end');
    expect((end.body.aps['content-state'] as { title: string }).title).toBe(
      'Lily is here · KL Sentral',
    );
    const dismissal = end.body.aps['dismissal-date'] as number;
    expect(dismissal - Date.now() / 1000).toBeGreaterThan(14 * 60);
    const tokens =
      await localDb()`select token from public.live_activity_tokens where token = ${ACTIVITY}`;
    expect(tokens.length).toBe(0);
  });
});
