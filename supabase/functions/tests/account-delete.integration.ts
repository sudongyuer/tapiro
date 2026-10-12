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

  test('deletes the calling user and their profile, leaving another user untouched', async () => {
    expect(await profileExists(a.id)).toBe(true);
    const res = await post({ Authorization: `Bearer ${a.token}`, apikey: anonKey });
    expect(res.status).toBe(200);
    expect(await userExists(a.id)).toBe(false);
    expect(await profileExists(a.id)).toBe(false);
    expect(await userExists(b.id)).toBe(true);
    expect(await profileExists(b.id)).toBe(true);
  });

  test('works through supabase-js functions.invoke as the app calls it', async () => {
    const { error } = await b.client.functions.invoke('account-delete', { method: 'POST' });
    expect(error).toBeNull();
    expect(await userExists(b.id)).toBe(false);
  });
});
