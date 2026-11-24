import { afterAll, describe, expect, test } from 'bun:test';
import type { TransactionSQL } from 'bun';
import { createClient } from '@supabase/supabase-js';

import { createSupabasePostService } from './postService';
import type { PublishArgs } from './types';
import { closeLocalDb, localDb } from '../../../../scripts/local-db';
import { localSupabase } from '../../../../scripts/local-supabase';

const value = localSupabase;

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const users: string[] = [];

async function poster(freeUsed: number, coins: number) {
  const email = `poster-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Poster' },
  });
  if (error) throw error;
  const id = data.user.id;
  users.push(id);
  const client = createClient(value('API_URL'), value('ANON_KEY'), {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  const db = localDb();
  await db`
    insert into public.coin_ledger (user_id, reason, delta) values (${id}, 'onboarding_first_post', 1)
  `;
  for (let used = 0; used < freeUsed; used += 1) {
    await db`
      insert into public.post_charges (item_kind, item_id, user_id, charge, free_month)
      values ('bounty', ${crypto.randomUUID()}, ${id}, 'free', public.malaysia_month(now()))
    `;
  }
  const adjust = coins - (await balance(id));
  if (adjust !== 0) {
    await db`
      insert into public.coin_ledger (user_id, reason, delta, item_kind, item_id)
      values (${id}, 'post_spend', ${adjust}, 'bounty', ${crypto.randomUUID()})
    `;
  }
  return { id, post: createSupabasePostService(client) };
}

async function balance(id: string) {
  const [{ coins }] = await localDb()`
    select coalesce(sum(delta), 0)::int as coins from public.coin_ledger where user_id = ${id}
  `;
  return coins as number;
}

function draft(): PublishArgs {
  return {
    id: crypto.randomUUID(),
    title: '帮我买杯咖啡',
    category: 'pickup',
    art: null,
    reward_minor: 600,
    reward_currency: 'MYR',
    description: null,
    place_label: null,
    latitude: null,
    longitude: null,
    address: null,
    starts_at: null,
    ends_at: null,
    deadline_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  };
}

async function waiters(tx: TransactionSQL, count: number) {
  const until = Date.now() + 10_000;
  while (Date.now() < until) {
    const [{ n }] = await tx`select count(distinct pid)::int as n from pg_locks where not granted`;
    if (n >= count) return;
    await Bun.sleep(25);
  }
  throw new Error(`fewer than ${count} sessions waited on the held lock`);
}

async function racing(uid: string, post: ReturnType<typeof createSupabasePostService>) {
  const drafts = [draft(), draft()];
  let calls!: readonly [ReturnType<typeof post.publish>, ReturnType<typeof post.publish>];
  await localDb().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtextextended('coins:' || ${uid}::text, 0))`;
    const first = post.publish(drafts[0]);
    await waiters(tx, 1);
    const second = post.publish(drafts[1]);
    await waiters(tx, 2);
    calls = [first, second];
  });
  const [first, second] = await Promise.all(calls);
  return { drafts, first, second };
}

async function published(ids: string[]) {
  const rows = await localDb()`select id from public.bounties where id in ${localDb()(ids)}`;
  return rows.map((row: { id: string }) => row.id);
}

async function charges(uid: string) {
  const rows = await localDb()`
    select charge::text, count(*)::int as n from public.post_charges
    where user_id = ${uid} and refunded_at is null and free_month = public.malaysia_month(now())
    group by charge order by charge
  `;
  return Object.fromEntries(rows.map((row: { charge: string; n: number }) => [row.charge, row.n]));
}

describe('two publishes racing for the last free slot or coin (local stack)', () => {
  afterAll(async () => {
    for (const id of users) await admin.auth.admin.deleteUser(id);
    await closeLocalDb();
  });

  test('the last free slot goes to one publish and the other is refused without a trace', async () => {
    const { id, post } = await poster(2, 0);
    const { drafts, first, second } = await racing(id, post);
    expect(first.ok && first.result.charge).toBe('free');
    expect(second).toEqual({ ok: false, reason: 'noBalance' });
    expect(await published(drafts.map((d) => d.id))).toEqual([drafts[0].id]);
    expect(await charges(id)).toEqual({ free: 3 });
    expect(await balance(id)).toBe(0);
  });

  test('the last coin is spent once and the other publish is refused without a trace', async () => {
    const { id, post } = await poster(3, 1);
    const { drafts, first, second } = await racing(id, post);
    expect(first.ok && first.result.charge).toBe('coin');
    expect(second).toEqual({ ok: false, reason: 'noBalance' });
    expect(await published(drafts.map((d) => d.id))).toEqual([drafts[0].id]);
    expect(await charges(id)).toEqual({ coin: 1, free: 3 });
    expect(await balance(id)).toBe(0);
    const [{ n }] = await localDb()`
      select count(*)::int as n from public.coin_ledger
      where user_id = ${id} and reason = 'post_spend' and item_id = ${drafts[0].id}
    `;
    expect(n).toBe(1);
  });

  test('the last free slot then the last coin serve two publishes, one each', async () => {
    const { id, post } = await poster(2, 1);
    const { drafts, first, second } = await racing(id, post);
    expect(first.ok && first.result.charge).toBe('free');
    expect(second.ok && second.result.charge).toBe('coin');
    expect((await published(drafts.map((d) => d.id))).sort()).toEqual(
      drafts.map((d) => d.id).sort(),
    );
    expect(await charges(id)).toEqual({ coin: 1, free: 3 });
    expect(await balance(id)).toBe(0);
  });
});
