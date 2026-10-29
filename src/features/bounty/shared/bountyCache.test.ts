import { expect, test } from 'bun:test';

import type { BoardRow, BountyDetail } from '../board/types';
import { createBountyCache, type ApplicationChange } from './bountyCache';

const ROW: BoardRow = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  placeLabel: null,
  stickerPath: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  urgent: false,
  distanceM: null,
  appliedByMe: false,
  createdAt: '2026-10-27T03:00:00.000Z',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
};

const DETAIL: BountyDetail = {
  id: 'b1',
  title: '帮取快递',
  description: null,
  category: 'pickup',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
  status: 'open',
  viewerRole: 'viewer',
  place: null,
  distanceM: null,
  address: null,
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  expiresAt: '2026-11-03T03:00:00.000Z',
  poster: ROW.poster,
  helper: null,
  myApplication: null,
};

test('applying and withdrawing update the row and detail in place and tell listeners', () => {
  const cache = createBountyCache();
  const changes: ApplicationChange[] = [];
  const stop = cache.onApplicationChange((change) => changes.push(change));
  cache.seed([ROW]);
  cache.setDetail(DETAIL);
  cache.markApplied('b1', '我在楼下');
  expect(cache.row('b1')?.appliedByMe).toBe(true);
  expect(cache.detail('b1')?.myApplication).toEqual({ status: 'pending', note: '我在楼下' });
  cache.markWithdrawn('b1');
  expect(cache.row('b1')?.appliedByMe).toBe(false);
  expect(cache.detail('b1')?.myApplication?.status).toBe('withdrawn');
  stop();
  cache.markApplied('b1', null);
  expect(changes).toEqual([
    { id: 'b1', applied: true, note: '我在楼下' },
    { id: 'b1', applied: false, note: null },
  ]);
});

test('drop and clear forget rows and details', () => {
  const cache = createBountyCache();
  cache.seed([ROW]);
  cache.setDetail(DETAIL);
  cache.drop('b1');
  expect(cache.row('b1')).toBeNull();
  expect(cache.detail('b1')).toBeNull();
  cache.seed([ROW]);
  cache.clear();
  expect(cache.row('b1')).toBeNull();
});

test('settleRow brings a stale row in line with the server and tells the board once', () => {
  const cache = createBountyCache();
  const changes: ApplicationChange[] = [];
  cache.onApplicationChange((change) => changes.push(change));
  cache.seed([{ ...ROW, appliedByMe: true }]);
  cache.settleRow('b1', false);
  cache.settleRow('b1', false);
  cache.settleRow('missing', false);
  expect(cache.row('b1')?.appliedByMe).toBe(false);
  expect(changes).toEqual([{ id: 'b1', applied: false, note: null, fromServer: true }]);
});
