import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createClient } from '@supabase/supabase-js';

import { createSupabasePostService } from './postService';
import type { PublishArgs } from './types';
import { localSupabase } from '../../../../scripts/local-supabase';

const value = localSupabase;

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

async function signedIn(name: string) {
  const email = `${name}-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const client = createClient(value('API_URL'), value('ANON_KEY'), {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: data.user.id, service: createSupabasePostService(client) };
}

const draft = (patch: Partial<PublishArgs> = {}): PublishArgs => ({
  id: crypto.randomUUID(),
  title: '帮我取个快递',
  category: 'pickup',
  art: null,
  reward_minor: 800,
  reward_currency: 'MYR',
  description: 'Shopee 包裹在 Sunway Geo 管理处',
  place_label: null,
  latitude: null,
  longitude: null,
  address: null,
  starts_at: null,
  ends_at: null,
  deadline_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  ...patch,
});

describe('supabase post service (local stack)', () => {
  let poster: Awaited<ReturnType<typeof signedIn>>;
  let payee: Awaited<ReturnType<typeof signedIn>>;

  beforeAll(async () => {
    poster = await signedIn('Poster');
    payee = await signedIn('Payee');
  });

  afterAll(async () => {
    for (const user of [poster, payee]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  test('publishes once for one draft id, even when sent twice', async () => {
    const before = await poster.service.status();
    expect(before).toMatchObject({
      blocked: false,
      unpaid: [],
      freePostsLeft: 3,
      freePostsPerMonth: 3,
    });
    expect(Date.parse(before.nextFreeAt)).toBeGreaterThan(Date.now());

    const args = draft();
    const first = await poster.service.publish(args);
    expect(first).toEqual({
      ok: true,
      result: { id: args.id, status: 'open', charge: 'free', expiresAt: expect.any(String) },
    });
    expect(await poster.service.publish(args)).toEqual(first);
    expect((await poster.service.status()).freePostsLeft).toBe(2);
  });

  test('a rejected draft maps to invalid and is not charged', async () => {
    const past = draft({ deadline_at: new Date(Date.now() - 60_000).toISOString() });
    expect(await poster.service.publish(past)).toEqual({ ok: false, reason: 'invalid' });
    expect((await poster.service.status()).freePostsLeft).toBe(2);
  });

  test('unpaid payments block and name the payee', async () => {
    for (const amount of [1500, 600]) {
      const { error } = await admin.rpc('open_payment', {
        kind: 'bounty',
        item: crypto.randomUUID(),
        item_title: '帮取快递',
        payer: poster.id,
        payee: payee.id,
        amount,
        currency: 'MYR',
      });
      if (error) throw error;
    }
    const status = await poster.service.status();
    expect(status.blocked).toBe(true);
    expect(status.unpaid.map(({ payeeName, amount }) => [payeeName, amount])).toEqual([
      ['Payee', { minor: 1500, currency: 'MYR' }],
      ['Payee', { minor: 600, currency: 'MYR' }],
    ]);
    expect(await poster.service.publish(draft())).toEqual({ ok: false, reason: 'blocked' });
  });
});
