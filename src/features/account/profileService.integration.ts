import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

import { createSupabaseProfileService } from './profileService';
import type { AccountUser } from './types';
import { localSupabase } from '../../../scripts/local-supabase';

const value = localSupabase;

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});
const client = createClient(value('API_URL'), value('ANON_KEY'), {
  auth: { persistSession: false },
});
const service = createSupabaseProfileService(client);
let user: AccountUser;

describe('supabase profile service (local stack)', () => {
  beforeAll(async () => {
    const email = `profile-${crypto.randomUUID()}@example.test`;
    const password = `pw-${crypto.randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
    user = { id: data.user.id, email, name: null, avatarUrl: null, provider: null };
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
  });

  test('loads the trigger placeholder, then saves name and avatar', async () => {
    expect(await service.load(user)).toEqual({ displayName: 'Tapiro', avatarUrl: null });
    const next = { displayName: 'Lin Mo', avatarUrl: 'https://example.test/a.png' };
    expect(await service.save(user, next)).toBe(true);
    expect(await service.load(user)).toEqual(next);
  });

  test('inserts the row when it is missing', async () => {
    await admin.from('profiles').delete().eq('id', user.id);
    expect(await service.save(user, { displayName: 'Again', avatarUrl: null })).toBe(true);
    expect(await service.load(user)).toEqual({ displayName: 'Again', avatarUrl: null });
  });

  test('a name the database rejects reports failure', async () => {
    expect(await service.save(user, { displayName: 'x'.repeat(41), avatarUrl: null })).toBe(false);
  });
});
