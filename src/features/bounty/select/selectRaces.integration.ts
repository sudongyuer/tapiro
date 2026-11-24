import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { TransactionSQL } from 'bun';
import { createClient } from '@supabase/supabase-js';

import { createSupabasePostService } from '../post/postService';
import { createSupabaseSelectService } from './selectService';
import { closeLocalDb, localDb } from '../../../../scripts/local-db';
import { localSupabase } from '../../../../scripts/local-supabase';

const value = localSupabase;

const admin = createClient(value('API_URL'), value('SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

async function device(email: string, password: string) {
  const client = createClient(value('API_URL'), value('ANON_KEY'), {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return {
    client,
    select: createSupabaseSelectService(client),
    post: createSupabasePostService(client),
  };
}

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
  return { id: data.user.id, email, password, ...(await device(email, password)) };
}

type User = Awaited<ReturnType<typeof signedIn>>;
type Device = Awaited<ReturnType<typeof device>>;

async function must<T>(call: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await call;
  if (error) throw error;
  return data;
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

async function whileHolding<T>(hold: (tx: TransactionSQL) => Promise<T>) {
  let held!: T;
  await localDb().begin(async (tx) => {
    held = await hold(tx);
  });
  return held;
}

async function applied(poster: User, applicants: User[]) {
  const id = crypto.randomUUID();
  const published = await poster.post.publish({
    id,
    title: '帮我搬个箱子',
    category: 'pickup',
    art: null,
    reward_minor: 1500,
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
  for (const applicant of applicants) {
    await must(applicant.client.rpc('apply_to_bounty', { bounty: id }));
  }
  return id;
}

async function selectedEvents(id: string) {
  const rows = await localDb()`
    select actor_id from public.bounty_events where bounty_id = ${id} and kind = 'selected'
  `;
  return rows.map((row: { actor_id: string }) => row.actor_id);
}

async function applications(id: string) {
  const rows = await localDb()`
    select applicant_id, status::text from public.bounty_applications where bounty_id = ${id}
  `;
  return Object.fromEntries(
    rows.map((row: { applicant_id: string; status: string }) => [row.applicant_id, row.status]),
  );
}

async function assignee(id: string) {
  const [row] =
    await localDb()`select status::text, helper_id from public.bounties where id = ${id}`;
  return row as { status: string; helper_id: string | null };
}

describe('selecting a helper from two devices at once (local stack)', () => {
  let poster: User;
  let otherDevice: Device;
  let first: User;
  let second: User;

  beforeAll(async () => {
    poster = await signedIn('Poster');
    otherDevice = await device(poster.email, poster.password);
    first = await signedIn('First');
    second = await signedIn('Second');
    for (const helper of [first, second]) {
      await must(helper.client.from('payee_methods').insert({ type: 'cash' }));
    }
    await localDb()`
      insert into public.coin_ledger (user_id, reason, delta) values (${poster.id}, 'help_settled', 10)
    `;
  });

  afterAll(async () => {
    for (const user of [poster, first, second])
      if (user) await admin.auth.admin.deleteUser(user.id);
    await closeLocalDb();
  });

  test('two devices picking different people assign the first and tell the second it is taken', async () => {
    const id = await applied(poster, [first, second]);
    const [phone, tablet] = await whileHolding(async (tx) => {
      await tx`select 1 from public.bounties where id = ${id} for update`;
      const one = poster.select.select(id, first.id);
      await waiters(tx, 1);
      const two = otherDevice.select.select(id, second.id);
      await waiters(tx, 2);
      return [one, two] as const;
    });
    expect(await phone).toEqual({ ok: true, helperId: first.id });
    expect(await tablet).toEqual({ ok: false, reason: 'taken' });
    expect(await assignee(id)).toEqual({ status: 'assigned', helper_id: first.id });
    expect(await applications(id)).toEqual({
      [first.id]: 'selected',
      [second.id]: 'not_selected',
    });
    expect(await selectedEvents(id)).toEqual([poster.id]);
  });

  test('two devices picking the same person both succeed and select once', async () => {
    const id = await applied(poster, [first, second]);
    const [phone, tablet] = await whileHolding(async (tx) => {
      await tx`select 1 from public.bounties where id = ${id} for update`;
      const one = poster.select.select(id, second.id);
      await waiters(tx, 1);
      const two = otherDevice.select.select(id, second.id);
      await waiters(tx, 2);
      return [one, two] as const;
    });
    expect(await phone).toEqual({ ok: true, helperId: second.id });
    expect(await tablet).toEqual({ ok: true, helperId: second.id });
    expect(await assignee(id)).toEqual({ status: 'assigned', helper_id: second.id });
    expect(await applications(id)).toEqual({
      [first.id]: 'not_selected',
      [second.id]: 'selected',
    });
    expect(await selectedEvents(id)).toEqual([poster.id]);
  });

  test('an applicant withdrawing while the poster selects them is answered as not pending', async () => {
    const id = await applied(poster, [first, second]);
    const [withdrawal, selection] = await whileHolding(async (tx) => {
      await tx`select 1 from public.bounties where id = ${id} for update`;
      const one = must(first.client.rpc('withdraw_application', { bounty: id }));
      await waiters(tx, 1);
      const two = poster.select.select(id, first.id);
      await waiters(tx, 2);
      return [one, two] as const;
    });
    expect(await withdrawal).toEqual({ status: 'withdrawn' });
    expect(await selection).toEqual({ ok: false, reason: 'notPending' });
    expect(await assignee(id)).toEqual({ status: 'open', helper_id: null });
    expect(await selectedEvents(id)).toEqual([]);
  });
});
