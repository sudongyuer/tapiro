import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabasePostService } from './postService';
import type { PublishArgs, PublishResult } from './types';

type Answer = { data: unknown; error: unknown };

const ME = 'user-me';

const PAYMENTS = [
  {
    id: 'pay-old',
    payee_id: 'jie',
    amount_sen: 1500,
    state: 'due',
    nudged_at: null,
    created_at: '2026-10-18T00:00:00Z',
  },
  {
    id: 'pay-marked',
    payee_id: 'lily',
    amount_sen: 600,
    state: 'marked_paid',
    nudged_at: null,
    created_at: '2026-10-20T00:00:00Z',
  },
  {
    id: 'pay-nudged',
    payee_id: 'lily',
    amount_sen: 900,
    state: 'marked_paid',
    nudged_at: '2026-10-22T00:00:00Z',
    created_at: '2026-10-21T00:00:00Z',
  },
];

function stubClient(answers: { rpc?: Record<string, Answer>; publishThrows?: unknown } = {}) {
  const started: string[] = [];
  const calls: { kind: string; name: string; args: unknown[] }[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const rpcAnswers: Record<string, Answer> = {
    publish_blocked: { data: true, error: null },
    coin_balance: {
      data: {
        coins: 4,
        freePostsLeft: 0,
        freePostsPerMonth: 3,
        nextFreeAt: '2026-10-31T16:00:00Z',
      },
      error: null,
    },
    ...answers.rpc,
  };

  function query(table: string) {
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'order', 'returns']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ kind: table, name: method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: Answer) => void, reject: (error: unknown) => void) => {
      started.push(table);
      const data =
        table === 'payments'
          ? PAYMENTS
          : [
              { id: 'jie', display_name: '阿杰' },
              { id: 'lily', display_name: 'Lily' },
            ];
      return gate.then(() => ({ data, error: null })).then(resolve, reject);
    };
    return builder;
  }

  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: ME } } } }) },
    from: (table: string) => query(table),
    rpc: (name: string, args?: unknown) => {
      started.push(name);
      calls.push({ kind: 'rpc', name, args: [args] });
      if (name === 'publish_bounty' && answers.publishThrows) {
        return Promise.reject(answers.publishThrows);
      }
      return gate.then(() => rpcAnswers[name]);
    },
  } as unknown as SupabaseClient;

  return { client, started, calls, release };
}

const ARGS: PublishArgs = {
  id: '6f1c2a40-5d3b-4c8e-9a7f-0b1d2e3f4a5b',
  title: '帮我取个快递',
  category: 'pickup',
  reward_sen: 800,
  description: null,
  place_label: null,
  latitude: null,
  longitude: null,
  address: null,
  starts_at: null,
  ends_at: null,
  deadline_at: '2026-10-27T10:00:00.000Z',
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('status', () => {
  test('reads blocked, balance and unpaid payments in parallel', async () => {
    const stub = stubClient();
    const pending = createSupabasePostService(stub.client).status();
    await settle();
    expect([...stub.started].sort()).toEqual(['coin_balance', 'payments', 'publish_blocked']);
    stub.release();
    expect(await pending).toEqual({
      blocked: true,
      unpaid: [
        {
          paymentId: 'pay-old',
          payeeName: '阿杰',
          amountSen: 1500,
          createdAt: '2026-10-18T00:00:00Z',
        },
        {
          paymentId: 'pay-nudged',
          payeeName: 'Lily',
          amountSen: 900,
          createdAt: '2026-10-21T00:00:00Z',
        },
      ],
      coins: 4,
      freePostsLeft: 0,
      freePostsPerMonth: 3,
      nextFreeAt: '2026-10-31T16:00:00Z',
    });
    expect(stub.calls).toContainEqual({ kind: 'payments', name: 'eq', args: ['payer_id', ME] });
    expect(stub.calls).toContainEqual({
      kind: 'profiles',
      name: 'in',
      args: ['id', ['jie', 'lily']],
    });
  });

  test('a malformed balance or blocked flag fails instead of looking free', async () => {
    const cases: Record<string, Answer>[] = [
      { coin_balance: { data: { coins: 4 }, error: null } },
      { publish_blocked: { data: null, error: null } },
      { coin_balance: { data: null, error: { message: 'boom', code: 'XX000' } } },
    ];
    for (const rpc of cases) {
      const stub = stubClient({ rpc });
      stub.release();
      await expect(createSupabasePostService(stub.client).status()).rejects.toBeDefined();
    }
  });

  test('without a client the status fails', async () => {
    await expect(createSupabasePostService(null).status()).rejects.toThrow(
      'Supabase is not configured',
    );
  });
});

describe('publish', () => {
  test('passes the arguments unchanged and returns the result', async () => {
    const result: PublishResult = {
      id: ARGS.id,
      status: 'open',
      charge: 'free',
      expiresAt: '2026-10-27T10:00:00.000Z',
    };
    const stub = stubClient({ rpc: { publish_bounty: { data: result, error: null } } });
    stub.release();
    expect(await createSupabasePostService(stub.client).publish(ARGS)).toEqual({
      ok: true,
      result,
    });
    expect(stub.calls).toEqual([{ kind: 'rpc', name: 'publish_bounty', args: [ARGS] }]);
  });

  test.each([
    [{ message: 'publish_blocked', code: '55000' }, 'blocked'],
    [{ message: 'no_balance', code: '55000' }, 'noBalance'],
    [{ message: 'invalid_bounty', code: '22023' }, 'invalid'],
    [{ message: 'TypeError: Network request failed', code: '' }, 'failed'],
  ] as const)('maps %p to %s', async (error, reason) => {
    const stub = stubClient({ rpc: { publish_bounty: { data: null, error } } });
    stub.release();
    expect(await createSupabasePostService(stub.client).publish(ARGS)).toEqual({
      ok: false,
      reason,
    });
  });

  test('a thrown network error is a failure, not an exception', async () => {
    const stub = stubClient({ publishThrows: new TypeError('Network request failed') });
    stub.release();
    expect(await createSupabasePostService(stub.client).publish(ARGS)).toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  test('an unreadable success answer is a failure', async () => {
    const stub = stubClient({ rpc: { publish_bounty: { data: { id: ARGS.id }, error: null } } });
    stub.release();
    expect(await createSupabasePostService(stub.client).publish(ARGS)).toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  test('without a client the publish fails', async () => {
    expect(await createSupabasePostService(null).publish(ARGS)).toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('isPublished', () => {
  function bountiesClient(answer: Answer) {
    const asked: unknown[][] = [];
    const builder = {
      select: (...args: unknown[]) => (asked.push(['select', ...args]), builder),
      eq: (...args: unknown[]) => (asked.push(['eq', ...args]), builder),
      maybeSingle: async () => answer,
    };
    const client = {
      from: (table: string) => (asked.push(['from', table]), builder),
    } as unknown as SupabaseClient;
    return { client, asked };
  }

  test('reads the user’s own bounty with that id through RLS', async () => {
    const stub = bountiesClient({ data: { id: ARGS.id }, error: null });
    expect(await createSupabasePostService(stub.client).isPublished(ARGS.id)).toBe(true);
    expect(stub.asked).toEqual([
      ['from', 'bounties'],
      ['select', 'id'],
      ['eq', 'id', ARGS.id],
    ]);
  });

  test('no row means not published', async () => {
    const stub = bountiesClient({ data: null, error: null });
    expect(await createSupabasePostService(stub.client).isPublished(ARGS.id)).toBe(false);
  });

  test('a failed read throws instead of answering no', async () => {
    const stub = bountiesClient({ data: null, error: { message: 'JWT expired' } });
    await expect(createSupabasePostService(stub.client).isPublished(ARGS.id)).rejects.toMatchObject(
      {
        message: 'JWT expired',
      },
    );
  });
});
