import { describe, expect, test } from 'bun:test';

import type { BoardRow, BountyDetail } from '../board/types';
import {
  detailAction,
  detailReducer,
  initialDetail,
  shownView,
  type DetailState,
} from './detailState';

const NOW = new Date('2026-10-27T04:00:00.000Z');

const ROW: BoardRow = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  rewardSen: 800,
  placeLabel: 'Sunway Geo 宿舍',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: '2026-10-27T05:00:00.000Z',
  urgent: true,
  distanceM: 300,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
};

const DETAIL: BountyDetail = {
  id: 'b1',
  title: '帮取快递',
  description: '取件码发你',
  category: 'pickup',
  rewardSen: 800,
  status: 'open',
  viewerRole: 'viewer',
  place: { label: 'Sunway Geo 宿舍' },
  distanceM: 300,
  address: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: '2026-10-27T05:00:00.000Z',
  expiresAt: '2026-10-27T05:00:00.000Z',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
  myApplication: null,
};

const run = (state: DetailState, ...events: Parameters<typeof detailReducer>[1][]) =>
  events.reduce(detailReducer, state);

describe('detailReducer', () => {
  test('a seeded load shows the row without a description until the detail answers', () => {
    const loading = run(initialDetail(ROW), { type: 'started', request: 1 });
    expect(loading).toMatchObject({ kind: 'loading', seed: ROW });
    expect(shownView(loading, NOW)).toMatchObject({ title: '帮取快递', description: undefined });
    const ready = run(loading, { type: 'loaded', request: 1, detail: DETAIL });
    expect(shownView(ready, NOW)).toMatchObject({ description: '取件码发你', action: 'apply' });
  });

  test('a failed first load is failed, never ready, and keeps the seed for the header', () => {
    const failed = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'failed', request: 1 },
    );
    expect(failed).toEqual({ request: 1, kind: 'failed', seed: ROW });
    expect(
      run(initialDetail(null), { type: 'started', request: 1 }, { type: 'failed', request: 1 }),
    ).toEqual({ request: 1, kind: 'failed', seed: null });
  });

  test('a failed refresh keeps the detail and marks it, and a later load clears the mark', () => {
    const ready = run(
      initialDetail(null),
      { type: 'started', request: 1 },
      { type: 'loaded', request: 1, detail: DETAIL },
    );
    const stale = run(ready, { type: 'started', request: 2 }, { type: 'failed', request: 2 });
    expect(stale).toMatchObject({ kind: 'ready', detail: DETAIL, refreshFailed: true });
    const fresh = run(
      stale,
      { type: 'started', request: 3 },
      { type: 'loaded', request: 3, detail: DETAIL },
    );
    expect(fresh).toMatchObject({ kind: 'ready', refreshFailed: false, refreshing: false });
  });

  test('an answer to an older request is dropped', () => {
    const state = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'started', request: 2 },
      { type: 'loaded', request: 1, detail: { ...DETAIL, title: 'old' } },
    );
    expect(state).toMatchObject({ kind: 'loading', request: 2 });
    expect(run(state, { type: 'gone', request: 1 }).kind).toBe('loading');
  });

  test('gone stays gone when the screen is focused again', () => {
    const gone = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'gone', request: 1 },
    );
    expect(gone.kind).toBe('gone');
    expect(run(gone, { type: 'started', request: 2 }).kind).toBe('gone');
    expect(shownView(gone, NOW)).toBeNull();
  });

  test('a cache change replaces a ready detail of the same bounty only', () => {
    const ready = run(
      initialDetail(null),
      { type: 'started', request: 1 },
      { type: 'loaded', request: 1, detail: DETAIL },
    );
    const applied = { ...DETAIL, myApplication: { status: 'pending' as const, note: null } };
    expect(shownView(run(ready, { type: 'changed', detail: applied }), NOW)?.action).toBe(
      'applied',
    );
    expect(run(ready, { type: 'changed', detail: { ...applied, id: 'b2' } })).toBe(ready);
    const loading = run(initialDetail(ROW), { type: 'started', request: 1 });
    expect(run(loading, { type: 'changed', detail: applied })).toBe(loading);
  });
});

describe('detailAction', () => {
  test('maps role, application and status to what the bottom shows', () => {
    expect(detailAction(DETAIL, NOW)).toBe('apply');
    expect(detailAction({ ...DETAIL, viewerRole: 'poster' }, NOW)).toBe('none');
    expect(detailAction({ ...DETAIL, myApplication: { status: 'pending', note: 'hi' } }, NOW)).toBe(
      'applied',
    );
    expect(
      detailAction({ ...DETAIL, myApplication: { status: 'withdrawn', note: null } }, NOW),
    ).toBe('apply');
    expect(detailAction({ ...DETAIL, status: 'assigned' }, NOW)).toBe('taken');
    expect(detailAction({ ...DETAIL, status: 'cancelled' }, NOW)).toBe('closed');
    expect(detailAction({ ...DETAIL, expiresAt: NOW.toISOString() }, NOW)).toBe('closed');
  });

  test('a seeded row shows 申请 or the applied block from appliedByMe', () => {
    expect(shownView(initialDetail(ROW), NOW)?.action).toBe('apply');
    expect(shownView(initialDetail({ ...ROW, appliedByMe: true }), NOW)?.action).toBe('applied');
  });
});
