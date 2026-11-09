import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { parseBountyDraft } from '../../../src/lib/drafts/bountyDraft';
import { localSupabase } from '../../../scripts/local-supabase';

const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const endpoint = `${url}/functions/v1/ai-draft`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = `pw-${crypto.randomUUID()}`;
const PROMPT = '帮我取快递，今晚之前';

let userId = '';
let token = '';
let client: SupabaseClient;

function ask(body: unknown, bearer: string = token) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const draft = () => ask({ task: 'draft_bounty', input: { text: PROMPT } });

async function status() {
  const { data, error } = await client.rpc('ai_status');
  if (error) throw error;
  return data as {
    energy: number;
    energyFull: number;
    leaves: number;
    coins: number;
    consent: { given: boolean };
  };
}

async function meterRows() {
  const { data, error } = await admin.from('ai_metering').select('*').eq('user_id', userId);
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  const email = `ai-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'AI Test' },
  });
  if (error) throw error;
  userId = data.user.id;
  client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  token = signIn.data.session.access_token;
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(userId);
});

describe('ai-draft on the local stack with the fake provider', () => {
  test('a call without a user token is refused', async () => {
    const response = await ask({ task: 'answer', input: { text: 'x' } }, anonKey);
    expect(response.status).toBe(401);
  });

  test('before consent the function refuses and meters nothing', async () => {
    const response = await draft();
    expect(await response.json()).toEqual({ error: 'consent_required' });
    expect(response.status).toBe(403);
    expect(await meterRows()).toEqual([]);
  });

  test('after consent a draft comes back in the shape the app parses, and energy drops', async () => {
    const { error } = await client.rpc('record_consent', { version: 1 });
    expect(error).toBeNull();
    const response = await draft();
    expect(response.status).toBe(200);
    const body = await response.json();
    const parsed = parseBountyDraft(body.result);
    expect(parsed.ok).toBe(true);
    expect(body.energy).toBe(666);
    expect((await status()).energy).toBe(666);
  });

  test('the metering row holds numbers and no words of the prompt', async () => {
    const rows = await meterRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      task: 'draft_bounty',
      model: 'fake',
      input_tokens: 3000,
      output_tokens: 600,
      energy_spent: 334,
    });
    expect(JSON.stringify(rows)).not.toContain(PROMPT);
  });

  test('the same belly gives three drafts, then 小貘 is hungry', async () => {
    expect((await draft()).status).toBe(200);
    expect((await draft()).status).toBe(200);
    expect((await status()).energy).toBe(0);
    const hungry = await draft();
    expect(await hungry.json()).toEqual({ error: 'hungry' });
    expect(hungry.status).toBe(429);
  });

  test('a coin becomes a leaf, the leaf fills the belly, and calls work again', async () => {
    const before = await status();
    const swapped = await client.rpc('swap_coin_for_leaf');
    expect(swapped.error).toBeNull();
    expect(swapped.data.leaves).toBe(1);
    expect(swapped.data.coins).toBe(before.coins - 1);
    const fed = await client.rpc('feed_leaf');
    expect(fed.error).toBeNull();
    expect(fed.data.energy).toBe(fed.data.energyFull);
    expect(fed.data.leaves).toBe(0);
    expect((await draft()).status).toBe(200);
  });

  test('a call waits while another holds the lease, and runs once it is released', async () => {
    const held = await admin.rpc('ai_begin_call', { uid: userId });
    expect(held.error).toBeNull();
    expect(held.data.status).toBe('ok');
    const busy = await draft();
    expect(await busy.json()).toEqual({ error: 'busy' });
    expect(busy.status).toBe(409);
    const released = await admin.rpc('ai_abort_call', { uid: userId, held: held.data.lease });
    expect(released.error).toBeNull();
    expect((await draft()).status).toBe(200);
  });

  test('a client cannot call the metering functions or read energy', async () => {
    const begin = await client.rpc('ai_begin_call', { uid: userId });
    expect(begin.error).not.toBeNull();
    const energy = await client.from('ai_energy').select('*');
    expect(energy.error).not.toBeNull();
  });

  test('withdrawing consent stops the next call', async () => {
    const { data, error } = await client.rpc('withdraw_consent');
    expect(error).toBeNull();
    expect(data.consent.given).toBe(false);
    const response = await draft();
    expect(await response.json()).toEqual({ error: 'consent_required' });
  });
});
