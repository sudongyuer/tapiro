import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { TransactionSQL } from 'bun';
import { createClient } from '@supabase/supabase-js';

import { createSupabasePostService } from '../post/postService';
import { createSupabaseStatusService } from './statusService';
import { closeLocalDb, localDb } from '../../../../scripts/local-db';
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
  return {
    id: data.user.id,
    client,
    status: createSupabaseStatusService(client, () => 'MYR'),
    post: createSupabasePostService(client),
  };
}

type User = Awaited<ReturnType<typeof signedIn>>;

async function must<T>(call: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await call;
  if (error) throw error;
  return data;
}

async function assigned(poster: User, helper: User) {
  const id = crypto.randomUUID();
  const published = await poster.post.publish({
    id,
    title: '帮我取个快递',
    category: 'pickup',
    art: null,
    reward_minor: 800,
    reward_currency: 'MYR',
    description: null,
    place_label: null,
    latitude: null,
    longitude: null,
    address: null,
    starts_at: null,
    ends_at: null,
    deadline_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
  });
  if (!published.ok) throw new Error(`publish failed: ${published.reason}`);
  await must(helper.client.rpc('apply_to_bounty', { bounty: id }));
  await must(poster.client.rpc('select_helper', { bounty: id, applicant: helper.id }));
  return id;
}

async function done(poster: User, helper: User) {
  const id = await assigned(poster, helper);
  const eta = new Date(Date.now() + 30 * 60_000).toISOString();
  expect((await helper.status.start(id, eta)).ok).toBe(true);
  expect((await helper.status.complete(id)).ok).toBe(true);
  await localDb()`
    update public.bounties set done_at = now() - interval '48 hours 1 minute' where id = ${id}
  `;
  return id;
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

async function actAs(tx: TransactionSQL, uid: string) {
  const claims = JSON.stringify({ sub: uid, role: 'authenticated' });
  await tx`select set_config('request.jwt.claim.sub', ${uid}, true),
    set_config('request.jwt.claims', ${claims}, true)`;
}

async function whileHolding<T>(hold: (tx: TransactionSQL) => Promise<T>) {
  let held!: T;
  await localDb().begin(async (tx) => {
    held = await hold(tx);
  });
  return held;
}

async function events(id: string): Promise<string[]> {
  const rows = await localDb()`
    select kind::text from public.bounty_events where bounty_id = ${id} order by id
  `;
  return rows.map((row: { kind: string }) => row.kind);
}

async function noShows(id: string) {
  return localDb()`
    select user_id, waived from public.reputation_events
    where kind = 'no_show' and item_kind = 'bounty' and item_id = ${id}
  `;
}

async function payments(id: string): Promise<string[]> {
  const rows = await localDb()`
    select id from public.payments where item_kind = 'bounty' and item_id = ${id}
  `;
  return rows.map((row: { id: string }) => row.id);
}

describe('bounty status races on two database sessions (local stack)', () => {
  let poster: User;
  let helper: User;

  beforeAll(async () => {
    poster = await signedIn('Poster');
    helper = await signedIn('Helper');
    await must(helper.client.from('payee_methods').insert({ type: 'cash' }));
    await localDb()`
      insert into public.coin_ledger (user_id, reason, delta) values (${poster.id}, 'help_settled', 5)
    `;
  });

  afterAll(async () => {
    for (const user of [poster, helper]) if (user) await admin.auth.admin.deleteUser(user.id);
    await closeLocalDb();
  });

  test('both sides cancelling at once cancel once and record one no-show', async () => {
    const id = await assigned(poster, helper);
    const [posterCancel, helperCancel] = await whileHolding(async (tx) => {
      await tx`select 1 from public.bounties where id = ${id} for update`;
      const first = poster.status.cancel(id);
      await waiters(tx, 1);
      const second = helper.status.cancel(id);
      await waiters(tx, 2);
      return [first, second] as const;
    });
    expect(await posterCancel).toEqual({
      ok: true,
      value: { offender: 'self', noShow: 'waived' },
    });
    expect(await helperCancel).toEqual({ ok: false, reason: 'changed' });
    expect((await events(id)).filter((kind) => kind === 'cancelled')).toEqual(['cancelled']);
    expect(await noShows(id)).toEqual([{ user_id: poster.id, waived: true }]);
    expect(await poster.status.cancel(id)).toEqual(await posterCancel);
  });

  test('two cancels by the same person at once use the waiver only once', async () => {
    const first = await assigned(poster, helper);
    const second = await assigned(poster, helper);
    const later = await whileHolding(async (tx) => {
      await actAs(tx, helper.id);
      const [{ answer }] = await tx`select public.cancel_bounty(${first}) as answer`;
      expect(answer).toEqual({ status: 'cancelled', offender: 'self', noShow: 'waived' });
      const blocked = helper.status.cancel(second);
      await waiters(tx, 1);
      return { blocked };
    });
    expect(await later.blocked).toEqual({
      ok: true,
      value: { offender: 'self', noShow: 'counted' },
    });
    expect([...(await noShows(first)), ...(await noShows(second))]).toEqual([
      { user_id: helper.id, waived: true },
      { user_id: helper.id, waived: false },
    ]);
  });

  test('the poster confirming while the 48 h job runs is answered with the job’s payment', async () => {
    const id = await done(poster, helper);
    const pending = await whileHolding(async (tx) => {
      await tx`select public.run_bounty_jobs()`;
      const confirm = poster.status.confirm(id);
      await waiters(tx, 1);
      return { confirm };
    });
    const [payment] = await payments(id);
    expect(await pending.confirm).toEqual({ ok: true, value: { paymentId: payment } });
    expect(await payments(id)).toEqual([payment]);
    expect((await events(id)).slice(-1)).toEqual(['auto_confirmed']);
    expect(await events(id)).not.toContain('confirmed');
  });

  test('the 48 h job skips a bounty the poster is confirming and never confirms it twice', async () => {
    const id = await done(poster, helper);
    await whileHolding(async (tx) => {
      await actAs(tx, poster.id);
      await tx`select public.confirm_bounty(${id})`;
      await must(admin.rpc('run_bounty_jobs'));
    });
    await must(admin.rpc('run_bounty_jobs'));
    const kinds = await events(id);
    expect(kinds.slice(-1)).toEqual(['confirmed']);
    expect(kinds).not.toContain('auto_confirmed');
    expect(await payments(id)).toHaveLength(1);
  });
});
