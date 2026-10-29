import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseBoardService } from './boardService';
import type { BoardOrigin } from './types';

type Answer = { data?: unknown; error?: unknown; count?: number | null };

const ROW = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  rewardSen: 800,
  placeLabel: 'Sunway Geo 宿舍',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: '2026-10-27T05:00:00+00:00',
  urgent: true,
  distanceM: 300,
  appliedByMe: false,
  createdAt: '2026-10-27T03:50:00+00:00',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
} as const;

const DETAIL = {
  id: 'b1',
  title: '帮取快递',
  description: null,
  category: 'pickup',
  rewardSen: 800,
  status: 'open',
  viewerRole: 'viewer',
  place: { label: 'Sunway Geo 宿舍' },
  distanceM: 300,
  address: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  expiresAt: '2026-11-03T03:50:00+00:00',
  publishedAt: '2026-10-27T03:50:00+00:00',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
  helper: null,
  myApplication: null,
  events: null,
};

const POINT = { latitude: 3.0733, longitude: 101.6078 };
const ME: BoardOrigin = { kind: 'me', point: POINT };

function stubClient(answers: (name: string, args: unknown) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answers(name, args);
    },
    from: (table: string) => ({
      select: async (columns: string, options: unknown) => {
        calls.push({ name: `from:${table}`, args: { columns, options } });
        return answers(`from:${table}`, options);
      },
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

const ok = (data: unknown): Answer => ({ data, error: null });
const rejected = (message: string, code = '55000'): Answer => ({
  data: null,
  error: { message, code },
});

describe('page', () => {
  test('passes the arguments in the RPC names and parses the page', async () => {
    const stub = stubClient(() => ok({ items: [ROW], next: null, total: 1 }));
    const service = createSupabaseBoardService(stub.client);
    expect(await service.page(ME, 'urgent', null)).toEqual({ items: [ROW], next: null, total: 1 });
    await service.page({ kind: 'none', reason: 'denied' }, 'all', { kind: 'recent' });
    expect(stub.calls).toEqual([
      {
        name: 'nearby_bounties',
        args: {
          latitude: 3.0733,
          longitude: 101.6078,
          board_filter: 'urgent',
          page_after: null,
          page_size: 20,
        },
      },
      {
        name: 'nearby_bounties',
        args: {
          latitude: null,
          longitude: null,
          board_filter: 'all',
          page_after: { kind: 'recent' },
          page_size: 20,
        },
      },
    ]);
  });

  test('carries the farther count and rejects a malformed one', async () => {
    const located = stubClient(() => ok({ items: [ROW], next: null, total: 3, beyondTotal: 2 }));
    expect(await createSupabaseBoardService(located.client).page(ME, 'all', null)).toEqual({
      items: [ROW],
      next: null,
      total: 3,
      beyondTotal: 2,
    });
    const malformed = stubClient(() => ok({ items: [ROW], next: null, total: 3, beyondTotal: -1 }));
    await expect(
      createSupabaseBoardService(malformed.client).page(ME, 'all', null),
    ).rejects.toThrow('beyondTotal');
  });

  test('a cursor mismatch restarts from page one once', async () => {
    const stub = stubClient((_name, args) =>
      (args as { page_after: unknown }).page_after === null
        ? ok({ items: [ROW], next: { kind: 'distance' }, total: 9 })
        : rejected('board_cursor_mismatch', '22023'),
    );
    const answer = await createSupabaseBoardService(stub.client).page(ME, 'all', { id: 'x' });
    expect(answer).toEqual({ items: [ROW], next: { kind: 'distance' }, total: 9, restarted: true });
    expect(stub.calls.map((call) => (call.args as { page_after: unknown }).page_after)).toEqual([
      { id: 'x' },
      null,
    ]);
  });

  test('a mismatch on the restarted page throws instead of looping', async () => {
    let calls = 0;
    const stub = stubClient(() => {
      calls += 1;
      return rejected('board_cursor_mismatch', '22023');
    });
    await expect(
      createSupabaseBoardService(stub.client).page(ME, 'all', { id: 'x' }),
    ).rejects.toBeDefined();
    expect(calls).toBe(2);
  });

  test.each([
    ['an RPC error', () => rejected('invalid_board_query', '22023')],
    ['a network error', () => Promise.reject(new TypeError('Network request failed'))],
    ['a malformed row', () => ok({ items: [{ ...ROW, poster: { id: 'p1', tier: 'gold' } }] })],
    ['a missing items list', () => ok({ next: null })],
  ])('%s throws', async (_label, answer) => {
    const stub = stubClient(answer);
    await expect(
      createSupabaseBoardService(stub.client).page(ME, 'all', null),
    ).rejects.toBeDefined();
  });

  test('without a client the page fails', async () => {
    await expect(createSupabaseBoardService(null).page(ME, 'all', null)).rejects.toThrow(
      'Supabase is not configured',
    );
  });
});

describe('detail', () => {
  test('passes the bounty and point and keeps the label-only place', async () => {
    const stub = stubClient(() => ok(DETAIL));
    const detail = await createSupabaseBoardService(stub.client).detail('b1', POINT);
    expect(detail).toMatchObject({ id: 'b1', place: { label: 'Sunway Geo 宿舍' }, distanceM: 300 });
    expect(detail === 'gone' ? null : detail.place).toEqual({ label: 'Sunway Geo 宿舍' });
    expect(stub.calls).toEqual([
      { name: 'bounty_detail', args: { bounty: 'b1', latitude: 3.0733, longitude: 101.6078 } },
    ]);
  });

  test('the helper is read for the poster and the helper only', async () => {
    const helper = { id: 'h1', name: '阿杰', tier: 'very_reliable' } as const;
    const read = async (viewerRole: string) => {
      const stub = stubClient(() => ok({ ...DETAIL, viewerRole, helper }));
      const detail = await createSupabaseBoardService(stub.client).detail('b1', null);
      return detail === 'gone' ? 'gone' : detail.helper;
    };
    expect(await read('poster')).toEqual(helper);
    expect(await read('helper')).toEqual(helper);
    expect(await read('applicant')).toBeNull();
    expect(await read('viewer')).toBeNull();
    const malformed = stubClient(() =>
      ok({ ...DETAIL, viewerRole: 'poster', helper: { id: 'h1', name: '阿杰', tier: 'gold' } }),
    );
    await expect(createSupabaseBoardService(malformed.client).detail('b1', null)).rejects.toThrow(
      'helper.tier',
    );
  });

  test('bounty_not_found reads as gone; other errors throw', async () => {
    const gone = stubClient(() => rejected('bounty_not_found', 'P0002'));
    expect(await createSupabaseBoardService(gone.client).detail('b1', null)).toBe('gone');
    const broken = stubClient(() => rejected('invalid_point', '22023'));
    await expect(
      createSupabaseBoardService(broken.client).detail('b1', null),
    ).rejects.toBeDefined();
  });
});

describe('hasPayeeMethod', () => {
  test('reads the head count of payee_methods', async () => {
    const some = stubClient(() => ({ data: null, error: null, count: 2 }));
    expect(await createSupabaseBoardService(some.client).hasPayeeMethod()).toBe(true);
    expect(some.calls).toEqual([
      {
        name: 'from:payee_methods',
        args: { columns: 'id', options: { count: 'exact', head: true } },
      },
    ]);
    const none = stubClient(() => ({ data: null, error: null, count: 0 }));
    expect(await createSupabaseBoardService(none.client).hasPayeeMethod()).toBe(false);
  });

  test('an error or a missing count throws instead of reading as none', async () => {
    const failed = stubClient(() => ({ data: null, error: { message: 'boom' }, count: null }));
    await expect(createSupabaseBoardService(failed.client).hasPayeeMethod()).rejects.toBeDefined();
    const missing = stubClient(() => ({ data: null, error: null, count: null }));
    await expect(createSupabaseBoardService(missing.client).hasPayeeMethod()).rejects.toBeDefined();
  });
});

describe('apply', () => {
  test('passes the bounty and note and returns the stored note', async () => {
    const stub = stubClient(() => ok({ status: 'pending', note: '我在楼下' }));
    expect(await createSupabaseBoardService(stub.client).apply('b1', '我在楼下 ')).toEqual({
      ok: true,
      note: '我在楼下',
    });
    expect(stub.calls).toEqual([
      { name: 'apply_to_bounty', args: { bounty: 'b1', note: '我在楼下 ' } },
    ]);
  });

  test.each([
    ['no_payee_method', 'noPayee'],
    ['closed', 'closed'],
    ['blocked', 'closed'],
    ['not_pending', 'closed'],
    ['taken', 'taken'],
    ['bounty_not_found', 'gone'],
    ['own_bounty', 'own'],
    ['something_else', 'failed'],
  ])('%s maps to %s', async (message, reason) => {
    const stub = stubClient(() => rejected(message));
    expect(await createSupabaseBoardService(stub.client).apply('b1', null)).toEqual({
      ok: false,
      reason,
    } as never);
  });

  test('a network error or an unexpected answer is failed', async () => {
    const network = stubClient(() => Promise.reject(new TypeError('Network request failed')));
    expect(await createSupabaseBoardService(network.client).apply('b1', null)).toEqual({
      ok: false,
      reason: 'failed',
    });
    const odd = stubClient(() => ok({ status: 'selected' }));
    expect(await createSupabaseBoardService(odd.client).apply('b1', null)).toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});

describe('withdraw', () => {
  test('withdraws, maps not_pending, and fails on a network error', async () => {
    const done = stubClient(() => ok({ status: 'withdrawn' }));
    expect(await createSupabaseBoardService(done.client).withdraw('b1')).toEqual({ ok: true });
    expect(done.calls).toEqual([{ name: 'withdraw_application', args: { bounty: 'b1' } }]);
    const late = stubClient(() => rejected('not_pending'));
    expect(await createSupabaseBoardService(late.client).withdraw('b1')).toEqual({
      ok: false,
      reason: 'notPending',
    });
    const network = stubClient(() => Promise.reject(new TypeError('Network request failed')));
    expect(await createSupabaseBoardService(network.client).withdraw('b1')).toEqual({
      ok: false,
      reason: 'failed',
    });
  });
});
