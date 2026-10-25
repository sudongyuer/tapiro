import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function localStack() {
  const out = Bun.spawnSync(['supabase', 'status', '-o', 'env']).stdout.toString();
  const value = (key: string) => out.match(new RegExp(`^${key}="([^"]+)"`, 'm'))?.[1];
  const url = value('API_URL');
  const anonKey = value('ANON_KEY');
  const serviceKey = value('SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) throw new Error('Local Supabase is not running');
  return { url, anonKey, serviceKey };
}

const { url, anonKey, serviceKey } = localStack();
const endpoint = `${url}/functions/v1/account-delete`;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = `pw-${crypto.randomUUID()}`;

async function createUser(name: string) {
  const email = `${name}-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, token: signIn.data.session.access_token, client };
}

async function profileExists(id: string) {
  const { data, error } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
  if (error) throw error;
  return data !== null;
}

async function userExists(id: string) {
  const { data } = await admin.auth.admin.getUserById(id);
  return Boolean(data.user);
}

async function payeeMethodCount(id: string) {
  const { count, error } = await admin
    .from('payee_methods')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', id);
  if (error) throw error;
  return count ?? 0;
}

const post = (headers: Record<string, string>) => fetch(endpoint, { method: 'POST', headers });

describe('account-delete (local stack)', () => {
  let a: { id: string; token: string; client: SupabaseClient };
  let b: { id: string; token: string; client: SupabaseClient };

  beforeAll(async () => {
    a = await createUser('user-a');
    b = await createUser('user-b');
  });

  afterAll(async () => {
    for (const user of [a, b]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test('rejects a call without a token', async () => {
    const res = await post({});
    expect(res.status).toBe(401);
    expect(await userExists(a.id)).toBe(true);
  });

  test('rejects the anon key, which carries no user', async () => {
    const res = await post({ Authorization: `Bearer ${anonKey}`, apikey: anonKey });
    expect(res.status).toBe(401);
    expect(await userExists(a.id)).toBe(true);
  });

  test('blocks deletion while a real payment is unsettled, then allows it after settlement', async () => {
    const opened = await admin.rpc('open_payment', {
      kind: 'bounty',
      item: crypto.randomUUID(),
      item_title: '帮取快递',
      payer: a.id,
      payee: b.id,
      amount: 1500,
    });
    expect(opened.error).toBeNull();
    const blocked = await post({ Authorization: `Bearer ${a.token}`, apikey: anonKey });
    expect(blocked.status).toBe(409);
    const body = await blocked.json();
    expect(body.payments).toEqual([
      {
        id: opened.data,
        title: '帮取快递',
        counterpartName: 'user-b',
        amountSen: 1500,
        direction: 'owe',
      },
    ]);
    const owed = await post({ Authorization: `Bearer ${b.token}`, apikey: anonKey });
    expect(owed.status).toBe(409);
    expect((await owed.json()).payments[0].direction).toBe('owed');
    expect(await userExists(a.id)).toBe(true);
    const { error } = await admin
      .from('payments')
      .update({ state: 'settled', settled_at: new Date().toISOString() })
      .eq('id', opened.data);
    expect(error).toBeNull();
  });

  test('deletes the calling user, their profile and payee methods, leaving another user untouched', async () => {
    expect(await profileExists(a.id)).toBe(true);
    for (const client of [a.client, b.client]) {
      const { error } = await client
        .from('payee_methods')
        .insert({ type: 'duitnow_id', phone: '+60123456789', display_name: 'LIM WEI JIE' });
      expect(error).toBeNull();
    }
    expect(await payeeMethodCount(a.id)).toBe(1);
    const res = await post({ Authorization: `Bearer ${a.token}`, apikey: anonKey });
    expect(res.status).toBe(200);
    expect(await userExists(a.id)).toBe(false);
    expect(await profileExists(a.id)).toBe(false);
    expect(await payeeMethodCount(a.id)).toBe(0);
    expect(await userExists(b.id)).toBe(true);
    expect(await profileExists(b.id)).toBe(true);
    expect(await payeeMethodCount(b.id)).toBe(1);
  });

  test('works through supabase-js functions.invoke as the app calls it', async () => {
    const { error } = await b.client.functions.invoke('account-delete', { method: 'POST' });
    expect(error).toBeNull();
    expect(await userExists(b.id)).toBe(false);
  });
});
