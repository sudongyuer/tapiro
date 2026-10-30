import { describe, expect, test } from 'bun:test';

import type { BoardRow, BountyDetail } from '../board/types';
import {
  detailAction,
  detailReducer,
  initialDetail,
  keptWrite,
  seenMarkDue,
  withWrite,
  shownView,
  viewOfDetail,
  type DetailState,
} from './detailState';

const NOW = new Date('2026-10-27T04:00:00.000Z');
const AT = '2026-10-27T03:59:00.000Z';

const ROW: BoardRow = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  art: null,
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  placeLabel: 'Sunway Geo 宿舍',
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: '2026-10-27T05:00:00.000Z',
  urgent: true,
  distanceM: 300,
  point: null,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
};

const DETAIL: BountyDetail = {
  id: 'b1',
  title: '帮取快递',
  description: '取件码发你',
  category: 'pickup',
  art: null,
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
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
  helper: null,
  myApplication: null,
};

const run = (state: DetailState, ...events: Parameters<typeof detailReducer>[1][]) =>
  events.reduce(detailReducer, state);

describe('detailReducer', () => {
  test('a seeded load shows the row without a description until the detail answers', () => {
    const loading = run(initialDetail(ROW), { type: 'started', request: 1 });
    expect(loading).toMatchObject({ kind: 'loading', seed: ROW });
    expect(shownView(loading, NOW)).toMatchObject({ title: '帮取快递', description: undefined });
    const ready = run(loading, { type: 'loaded', request: 1, detail: DETAIL, at: AT });
    expect(shownView(ready, NOW)).toMatchObject({ description: '取件码发你', action: 'apply' });
  });

  test('a failed first load is failed, never ready, and keeps the seed for the header', () => {
    const failed = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'failed', request: 1 },
    );
    expect(failed).toEqual({ request: 1, write: null, kind: 'failed', seed: ROW, retrying: false });
    expect(
      run(initialDetail(null), { type: 'started', request: 1 }, { type: 'failed', request: 1 }),
    ).toMatchObject({ kind: 'failed', seed: null });
  });

  test('重试 after a failure stays failed with progress, and a second failure keeps the notice', () => {
    const failed = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'failed', request: 1 },
    );
    const retrying = run(failed, { type: 'started', request: 2 });
    expect(retrying).toMatchObject({ kind: 'failed', retrying: true });
    expect(run(retrying, { type: 'failed', request: 2 })).toMatchObject({
      kind: 'failed',
      retrying: false,
    });
    expect(run(retrying, { type: 'loaded', request: 2, detail: DETAIL, at: AT }).kind).toBe(
      'ready',
    );
  });

  test('a failed refresh keeps the detail and marks it, and a later load clears the mark', () => {
    const ready = run(
      initialDetail(null),
      { type: 'started', request: 1 },
      { type: 'loaded', request: 1, detail: DETAIL, at: AT },
    );
    const stale = run(ready, { type: 'started', request: 2 }, { type: 'failed', request: 2 });
    expect(stale).toMatchObject({ kind: 'ready', detail: DETAIL, refreshFailed: true });
    const fresh = run(
      stale,
      { type: 'started', request: 3 },
      { type: 'loaded', request: 3, detail: DETAIL, at: AT },
    );
    expect(fresh).toMatchObject({ kind: 'ready', refreshFailed: false, refreshing: false });
  });

  test('an answer to an older request is dropped', () => {
    const state = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'started', request: 2 },
      { type: 'loaded', request: 1, detail: { ...DETAIL, title: 'old' }, at: AT },
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

  test('applying while the first load is in flight wins over that older answer', () => {
    const loading = run(initialDetail(ROW), { type: 'started', request: 1 });
    const applied = run(loading, { type: 'written', applied: true, note: '我在楼下' });
    expect(shownView(applied, NOW)).toMatchObject({ action: 'applied', note: '我在楼下' });
    const answered = run(applied, { type: 'loaded', request: 1, detail: DETAIL, at: AT });
    expect(shownView(answered, NOW)).toMatchObject({ action: 'applied', note: '我在楼下' });
    expect(
      answered.kind === 'ready' && withWrite(answered.detail, answered.write).myApplication,
    ).toEqual({ status: 'pending', note: '我在楼下' });
    const refreshed = run(
      answered,
      { type: 'started', request: 2 },
      { type: 'loaded', request: 2, detail: DETAIL, at: AT },
    );
    expect(refreshed.write).toBeNull();
    expect(shownView(refreshed, NOW)?.action).toBe('apply');
  });

  test('withdrawing while a refresh is in flight wins over that answer', () => {
    const pending = { ...DETAIL, myApplication: { status: 'pending' as const, note: null } };
    const ready = run(
      initialDetail(null),
      { type: 'started', request: 1 },
      { type: 'loaded', request: 1, detail: pending, at: AT },
      { type: 'started', request: 2 },
      { type: 'written', applied: false, note: null },
      { type: 'loaded', request: 2, detail: pending, at: AT },
    );
    expect(shownView(ready, NOW)).toMatchObject({ action: 'apply', note: null });
    expect(keptWrite({ applied: true, note: null, request: 1 }, 2)).toBeNull();
    expect(keptWrite({ applied: true, note: null, request: 2 }, 2)).not.toBeNull();
  });

  test('a write on a failed load shows on the seed, and gone clears it', () => {
    const failed = run(
      initialDetail(ROW),
      { type: 'started', request: 1 },
      { type: 'failed', request: 1 },
      { type: 'written', applied: true, note: null },
    );
    expect(shownView(failed, NOW)?.action).toBe('applied');
    const gone = run(failed, { type: 'started', request: 2 }, { type: 'gone', request: 2 });
    expect(gone).toEqual({ request: 2, write: null, kind: 'gone' });
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

const NOT_SELECTED: BountyDetail = {
  ...DETAIL,
  status: 'assigned',
  viewerRole: 'applicant',
  myApplication: { status: 'not_selected', note: '我在楼下' },
};

const SELECTED: BountyDetail = {
  ...DETAIL,
  status: 'assigned',
  viewerRole: 'helper',
  address: 'A 座 12-03',
  helper: { id: 'me', name: '林小貘', tier: 'reliable' },
  myApplication: { status: 'selected', note: null },
};

const POSTER: BountyDetail = {
  ...DETAIL,
  status: 'assigned',
  viewerRole: 'poster',
  address: 'A 座 12-03',
  helper: { id: 'me', name: '林小貘', tier: 'reliable' },
};

describe('outcomes', () => {
  test('not selected: the outcome block with the note, never the applied stamp', () => {
    const view = shownView(
      run(
        initialDetail(null),
        { type: 'started', request: 1 },
        { type: 'loaded', request: 1, detail: NOT_SELECTED, at: AT },
      ),
      NOW,
    );
    expect(view).toMatchObject({ action: 'notSelected', note: '我在楼下', address: null });
  });

  test('the helper role is the selected state with the exact address', () => {
    expect(detailAction(SELECTED, NOW)).toBe('selected');
    expect(
      shownView(
        run(
          initialDetail(null),
          { type: 'started', request: 1 },
          { type: 'loaded', request: 1, detail: SELECTED, at: AT },
        ),
        NOW,
      ),
    ).toMatchObject({ action: 'selected', address: 'A 座 12-03', note: null });
  });

  test('only the helper sees an address, even when a detail carries one', () => {
    const view = shownView(
      run(
        initialDetail(null),
        { type: 'started', request: 1 },
        { type: 'loaded', request: 1, detail: { ...NOT_SELECTED, address: 'A 座 12-03' }, at: AT },
      ),
      NOW,
    );
    expect(view?.address).toBeNull();
    expect(detailAction({ ...DETAIL, viewerRole: 'poster', address: 'A 座 12-03' }, NOW)).toBe(
      'none',
    );
  });

  test('a pending apply write is never shown over a server outcome and is dropped', () => {
    for (const outcome of [NOT_SELECTED, SELECTED]) {
      const answered = run(
        initialDetail(ROW),
        { type: 'started', request: 1 },
        { type: 'written', applied: true, note: '新写的' },
        { type: 'loaded', request: 1, detail: outcome, at: AT },
      );
      expect(answered.write).toBeNull();
      expect(shownView(answered, NOW)?.action).toBe(detailAction(outcome, NOW));
      expect(withWrite(outcome, { applied: true, note: 'x', request: 1 })).toBe(outcome);
      expect(withWrite(outcome, { applied: false, note: null, request: 1 })).toBe(outcome);
    }
  });

  test('a write after the outcome is shown does not override it', () => {
    const ready = run(
      initialDetail(null),
      { type: 'started', request: 1 },
      { type: 'loaded', request: 1, detail: NOT_SELECTED, at: AT },
      { type: 'written', applied: true, note: null },
    );
    expect(shownView(ready, NOW)?.action).toBe('notSelected');
  });

  test('withdrawn keeps the step 4 behaviour', () => {
    const withdrawn = { ...DETAIL, myApplication: { status: 'withdrawn' as const, note: 'x' } };
    expect(
      shownView(
        run(
          initialDetail(null),
          { type: 'started', request: 1 },
          { type: 'loaded', request: 1, detail: withdrawn, at: AT },
        ),
        NOW,
      ),
    ).toMatchObject({ action: 'apply', note: null });
  });

  const STATUSES = ['assigned', 'en_route', 'done', 'disputed', 'confirmed', 'settled'];

  test.each(STATUSES)('%s: the helper sees 选了你 with the address and 看进度', (status) => {
    expect(viewOfDetail({ ...SELECTED, status }, NOW)).toMatchObject({
      action: 'selected',
      address: 'A 座 12-03',
      progress: true,
    });
  });

  test.each(STATUSES)('%s: the poster sees 看进度 and no outcome line', (status) => {
    expect(viewOfDetail({ ...POSTER, status }, NOW)).toMatchObject({
      action: 'none',
      progress: true,
    });
  });

  test('cancelled after selection: both parties see 这单取消了 and 看进度, never 选了你', () => {
    for (const party of [SELECTED, POSTER]) {
      expect(viewOfDetail({ ...party, status: 'cancelled' }, NOW)).toMatchObject({
        action: 'cancelled',
        address: null,
        progress: true,
      });
    }
  });

  test('an open bounty gives the poster no 看进度', () => {
    expect(viewOfDetail({ ...POSTER, status: 'open', helper: null }, NOW)).toMatchObject({
      action: 'none',
      progress: false,
    });
  });

  test('applicants and viewers never see 看进度', () => {
    expect(viewOfDetail(NOT_SELECTED, NOW).progress).toBe(false);
    expect(viewOfDetail({ ...NOT_SELECTED, status: 'cancelled' }, NOW)).toMatchObject({
      action: 'notSelected',
      progress: false,
    });
    expect(viewOfDetail({ ...DETAIL, status: 'cancelled' }, NOW)).toMatchObject({
      action: 'closed',
      progress: false,
    });
  });

  test('only a loaded not-selected answer is due a seen mark', () => {
    expect(seenMarkDue(NOT_SELECTED)).toBe(true);
    expect(seenMarkDue(SELECTED)).toBe(false);
    expect(seenMarkDue(DETAIL)).toBe(false);
    expect(seenMarkDue({ ...DETAIL, myApplication: { status: 'pending', note: null } })).toBe(
      false,
    );
  });
});
