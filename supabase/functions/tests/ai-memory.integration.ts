import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { localSupabase } from '../../../scripts/local-supabase';

const url = localSupabase('API_URL');
const anonKey = localSupabase('ANON_KEY');
const serviceKey = localSupabase('SERVICE_ROLE_KEY');
const endpoint = `${url}/functions/v1/ai-draft`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = `pw-${crypto.randomUUID()}`;

let userId = '';
let token = '';
let client: SupabaseClient;
let dormId = '';

function call(body: unknown) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const ask = (text: string) => call({ task: 'ask', input: { text } });

beforeAll(async () => {
  const email = `ai-memory-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Memory Test' },
  });
  if (error) throw error;
  userId = data.user.id;
  client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  token = signIn.data.session.access_token;
  const consent = await client.rpc('record_consent', { version: 2 });
  if (consent.error) throw consent.error;
  const saved = await client.rpc('save_ai_memory', {
    entry: null,
    kind: 'place',
    label: '宿舍',
    content: 'Sunway Geo',
  });
  if (saved.error) throw saved.error;
  dormId = (saved.data as { id: string }).id;
});

afterAll(async () => {
  await admin.auth.admin.deleteUser(userId);
});

describe('小貘记得 through the served ai-draft', () => {
  test('consent version 1 no longer lets a call through', async () => {
    const { data } = await client.rpc('ai_status');
    expect((data as { consent: { currentVersion: number } }).consent.currentVersion).toBe(2);
  });

  test('a draft names the entry the server read for it', async () => {
    const response = await ask('从宿舍帮我取快递到学校');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tool).toBe('draft_bounty');
    expect(body.memory.used).toEqual([
      { id: dormId, kind: 'place', label: '宿舍', content: 'Sunway Geo' },
    ]);
    expect(body.result).not.toHaveProperty('memory');
  });

  test('an offer comes back unsaved; only the user’s save stores it', async () => {
    const body = await (await ask('记住学校 = Sunway University')).json();
    expect(body.memory.offer).toEqual({
      kind: 'place',
      label: '学校',
      content: 'Sunway University',
    });
    const { count } = await admin
      .from('ai_memory')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    expect(count).toBe(1);
  });

  test('a translation carries no entry and no memory key', async () => {
    const response = await call({ task: 'translate', input: { text: '宿舍见', to: 'en' } });
    expect(response.status).toBe(200);
    expect(await response.json()).not.toHaveProperty('memory');
  });

  test('with the switch off the entry stays but is not used and nothing is offered', async () => {
    const off = await client.rpc('set_ai_memory_enabled', { enabled: false });
    expect(off.error).toBeNull();
    const body = await (await ask('记住学校 = Sunway University，从宿舍出发')).json();
    expect(body.memory).toEqual({ used: [], offer: null });
    const { data } = await client.from('ai_memory').select('label');
    expect(data).toEqual([{ label: '宿舍' }]);
  });
});
