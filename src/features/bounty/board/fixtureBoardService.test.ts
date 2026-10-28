import { describe, expect, test } from 'bun:test';

import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';

import {
  createFixtureBoardService,
  fixtureBoardOptions,
  type FixtureBoardOptions,
} from './fixtureBoardService';
import type { BoardFilter, BoardOrigin, BoardRow, BoardService } from './types';

const NOW = new Date('2026-10-27T04:00:00.000Z');
const ME: BoardOrigin = { kind: 'me', point: SUNWAY_PYRAMID };
const NONE: BoardOrigin = { kind: 'none', reason: 'denied' };

const service = (patch: Partial<FixtureBoardOptions> = {}) =>
  createFixtureBoardService({
    ...fixtureBoardOptions(
      () => undefined,
      'demo',
      () => NOW,
    ),
    ...patch,
  });

async function all(board: BoardService, origin: BoardOrigin, filter: BoardFilter = 'all') {
  const sizes: number[] = [];
  const rows: BoardRow[] = [];
  let after: unknown | null = null;
  do {
    const page = await board.page(origin, filter, after);
    sizes.push(page.items.length);
    rows.push(...page.items);
    after = page.next;
  } while (after !== null);
  return { sizes, rows };
}

const codePoints = (text: string) => [...text].length;

test('launch arguments pick the board, failure and apply mode', () => {
  const args: Record<string, string> = {
    uiVerifyBoard: 'long',
    uiVerifyBoardFail: 'page',
    uiVerifyApply: 'taken',
    uiVerifyDetail: 'failOnce',
  };
  expect(fixtureBoardOptions((name) => args[name], 'empty')).toMatchObject({
    board: 'long',
    fail: 'page',
    apply: 'taken',
    detail: 'failOnce',
    variant: 'empty',
  });
  expect(fixtureBoardOptions(() => 'nonsense', 'demo')).toMatchObject({
    board: 'full',
    fail: 'none',
    apply: 'ok',
    detail: 'ok',
  });
});

describe('full board', () => {
  test('12 rows: 9 located with 2 beyond 2 km, 3 unlocated, 2 urgent, 1 applied', async () => {
    const page = await service().page(ME, 'all', null);
    const located = page.items.filter((row) => row.distanceM !== null);
    expect(page.items).toHaveLength(12);
    expect(page.total).toBe(12);
    expect(page.next).toBeNull();
    expect(located).toHaveLength(9);
    expect(located.filter((row) => (row.distanceM ?? 0) > 2000)).toHaveLength(2);
    expect(page.items.filter((row) => row.urgent)).toHaveLength(2);
    expect(page.items.filter((row) => row.appliedByMe)).toHaveLength(1);
    expect(page.items.slice(9).every((row) => row.distanceM === null)).toBe(true);
  });

  test('ordered by distance like the RPC, with the cards the cases read', async () => {
    const { items } = await service().page(ME, 'all', null);
    expect(items.map((row) => row.distanceM)).toEqual([
      300,
      500,
      800,
      900,
      1200,
      1600,
      1900,
      3400,
      5200,
      null,
      null,
      null,
    ]);
    expect(items[0]).toMatchObject({
      title: '帮取快递',
      rewardSen: 800,
      urgent: true,
      placeLabel: 'Sunway Geo 宿舍',
      poster: { name: '小林', tier: 'reliable' },
    });
    expect(items[5].title).toBe('搬两个箱子上楼');
    expect(items[7].title).toBe('帮我去 JPJ 排号');
    const unlocated = items.slice(9).map((row) => row.createdAt);
    expect(unlocated).toEqual([...unlocated].sort().reverse());
  });

  test('without an origin rows come by recency with no distance', async () => {
    const { items } = await service().page(NONE, 'all', null);
    expect(items.every((row) => row.distanceM === null)).toBe(true);
    const created = items.map((row) => row.createdAt);
    expect(created).toEqual([...created].sort().reverse());
  });

  test('distances follow a chosen place', async () => {
    const geo: BoardOrigin = {
      kind: 'place',
      label: 'Sunway Geo Residences',
      point: { latitude: 3.0657, longitude: 101.611 },
    };
    const { items } = await service().page(geo, 'all', null);
    const distances = items.flatMap((row) => (row.distanceM === null ? [] : [row.distanceM]));
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(distances).not.toEqual([300, 500, 800, 900, 1200, 1600, 1900, 3400, 5200]);
  });

  test('filters follow the RPC rules', async () => {
    const urgent = await service().page(ME, 'urgent', null);
    expect(urgent.items.map((row) => row.title)).toEqual(['帮取快递', '帮我取外卖']);
    expect(urgent.total).toBe(2);
    const fits = await service().page(ME, 'fits_my_time', null);
    expect(fits.items.map((row) => row.title)).not.toContain('帮我买杯奶茶');
    expect(fits.items.map((row) => row.title)).not.toContain('教我微积分');
    expect(fits.total).toBe(10);
    const one = await service({ board: 'one' }).page(ME, 'fits_my_time', null);
    expect(one.items).toHaveLength(1);
  });

  test('the urgent flag follows the clock', async () => {
    let now = NOW;
    const board = createFixtureBoardService({
      ...fixtureBoardOptions(
        () => undefined,
        'demo',
        () => now,
      ),
    });
    now = new Date(NOW.getTime() + 61 * 60_000);
    const { items } = await board.page(ME, 'urgent', null);
    expect(items.map((row) => row.title)).toEqual(['帮我取外卖']);
  });
});

describe('paging', () => {
  test('long pages 20, 20, 5 with unique rows', async () => {
    for (const origin of [ME, NONE]) {
      const { sizes, rows } = await all(service({ board: 'long' }), origin);
      expect(sizes).toEqual([20, 20, 5]);
      expect(new Set(rows.map((row) => row.id)).size).toBe(45);
      expect(new Set(rows.map((row) => row.title)).size).toBe(45);
    }
  });

  test('the cursor is stable and only the first page carries total', async () => {
    const board = service({ board: 'long' });
    const first = await board.page(ME, 'all', null);
    const again = await board.page(ME, 'all', null);
    expect(again.next).toEqual(first.next);
    expect(first.total).toBe(45);
    const second = await board.page(ME, 'all', first.next);
    expect(second.total).toBeUndefined();
    await expect(board.page(ME, 'urgent', first.next)).rejects.toThrow('board_cursor_mismatch');
    await expect(board.page(NONE, 'all', first.next)).rejects.toThrow('board_cursor_mismatch');
  });

  test('empty and one', async () => {
    expect(await service({ board: 'empty' }).page(ME, 'all', null)).toEqual({
      items: [],
      next: null,
      total: 0,
    });
    const one = await service({ board: 'one' }).page(ME, 'all', null);
    expect(one.items.map((row) => [row.title, row.urgent])).toEqual([['帮忙打印论文', false]]);
    expect((await service({ board: 'one' }).page(ME, 'urgent', null)).items).toEqual([]);
  });
});

describe('failures', () => {
  test('first: the first load fails once', async () => {
    const board = service({ fail: 'first' });
    await expect(board.page(ME, 'all', null)).rejects.toBeDefined();
    expect((await board.page(ME, 'all', null)).items).toHaveLength(12);
  });

  test('refresh: the second load fails', async () => {
    const board = service({ fail: 'refresh' });
    await board.page(ME, 'all', null);
    await expect(board.page(ME, 'all', null)).rejects.toBeDefined();
    expect((await board.page(ME, 'all', null)).items).toHaveLength(12);
  });

  test('page: the second page fails once', async () => {
    const board = service({ board: 'long', fail: 'page' });
    const first = await board.page(ME, 'all', null);
    await expect(board.page(ME, 'all', first.next)).rejects.toBeDefined();
    expect((await board.page(ME, 'all', first.next)).items).toHaveLength(20);
  });
});

describe('worst', () => {
  test('carries the longest values the board must fit', async () => {
    const { items } = await service({ board: 'worst' }).page(ME, 'all', null);
    expect(Math.max(...items.map((row) => codePoints(row.title)))).toBe(60);
    expect(Math.max(...items.map((row) => codePoints(row.placeLabel ?? '')))).toBe(80);
    expect(Math.max(...items.map((row) => codePoints(row.poster.name ?? '')))).toBe(40);
    expect(items.map((row) => row.rewardSen).sort((a, b) => a - b)).toEqual([
      100, 100, 50000, 50000,
    ]);
    expect(items.map((row) => row.distanceM)).toContain(100);
    expect(items.map((row) => row.distanceM)).toContain(18_400);
    expect(items.some((row) => row.poster.tier === 'tapir_friend')).toBe(true);
    expect(
      items.some(
        (row) => row.placeLabel === null && row.startsAt === null && row.deadlineAt === null,
      ),
    ).toBe(true);
    const detail = await service({ board: 'worst' }).detail(items[0].id, null);
    expect(detail === 'gone' ? 0 : codePoints(detail.description ?? '')).toBe(500);
  });
});

describe('apply and withdraw', () => {
  test('apply is idempotent while pending and shows on the board and detail', async () => {
    const board = service();
    expect(await board.apply('fixture-bounty-01', '  我在楼下 ')).toEqual({
      ok: true,
      note: '我在楼下',
    });
    expect(await board.apply('fixture-bounty-01', 'another')).toEqual({
      ok: true,
      note: '我在楼下',
    });
    const { items } = await board.page(ME, 'all', null);
    expect(items[0].appliedByMe).toBe(true);
    expect(await board.detail('fixture-bounty-01', SUNWAY_PYRAMID)).toMatchObject({
      viewerRole: 'applicant',
      distanceM: 300,
      place: { label: 'Sunway Geo 宿舍' },
      myApplication: { status: 'pending', note: '我在楼下' },
    });
  });

  test('failOnce fails the first send only', async () => {
    const board = service({ apply: 'failOnce' });
    expect(await board.apply('fixture-bounty-01', null)).toEqual({ ok: false, reason: 'failed' });
    expect(await board.apply('fixture-bounty-01', null)).toEqual({ ok: true, note: null });
  });

  test.each(['taken', 'closed', 'gone'] as const)('%s rejects with that reason', async (mode) => {
    expect(await service({ apply: mode }).apply('fixture-bounty-01', null)).toEqual({
      ok: false,
      reason: mode,
    });
  });

  test('without a payee method apply rejects noPayee', async () => {
    const board = service({ variant: 'empty' });
    expect(await board.hasPayeeMethod()).toBe(false);
    expect(await board.apply('fixture-bounty-01', null)).toEqual({ ok: false, reason: 'noPayee' });
    expect(await service().hasPayeeMethod()).toBe(true);
  });

  test('withdraw clears the application; without one it is notPending', async () => {
    const board = service();
    expect(await board.withdraw('fixture-bounty-03')).toEqual({ ok: true });
    const { items } = await board.page(ME, 'all', null);
    expect(items.find((row) => row.id === 'fixture-bounty-03')?.appliedByMe).toBe(false);
    expect(await board.withdraw('fixture-bounty-01')).toEqual({ ok: false, reason: 'notPending' });
  });

  test('an unknown bounty is gone', async () => {
    expect(await service().detail('missing', null)).toBe('gone');
  });

  test('the detail fails once, then loads; gone answers gone for every id', async () => {
    const failing = service({ detail: 'failOnce' });
    await expect(failing.detail('fixture-bounty-01', null)).rejects.toThrow(
      'Network request failed',
    );
    expect(await failing.detail('fixture-bounty-01', null)).toMatchObject({ title: '帮取快递' });
    expect(await service({ detail: 'gone' }).detail('fixture-bounty-01', null)).toBe('gone');
  });
});

describe('blocked posters', () => {
  test('a blocked poster’s bounties leave the board and the detail answers gone', async () => {
    const blocked = new Set<string>();
    const board = service({ isBlocked: (id) => blocked.has(id) });
    const before = await all(board, ME);
    expect(before.rows.some((row) => row.poster.name === '小林')).toBe(true);
    blocked.add('fixture-poster-lin');
    const after = await all(board, ME);
    expect(after.rows.some((row) => row.poster.name === '小林')).toBe(false);
    expect(after.rows).toHaveLength(before.rows.length - 1);
    expect(await board.detail('fixture-bounty-01', null)).toBe('gone');
    blocked.delete('fixture-poster-lin');
    expect((await all(board, ME)).rows).toHaveLength(before.rows.length);
  });
});
