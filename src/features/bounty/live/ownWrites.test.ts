import { describe, expect, test } from 'bun:test';

import { row } from '../board/boardTestKit';
import { createBountyCache } from '../shared/bountyCache';
import { createFixtureLiveService } from './fixtureLiveService';
import { createLiveBountyStore } from './liveStore';
import { reloadOnOwnApplications } from './ownWrites';

const NOW = new Date('2026-11-21T06:00:00.000Z');
const settle = () => new Promise((done) => setTimeout(done, 0));

function setup() {
  const cache = createBountyCache();
  const live = createLiveBountyStore(
    createFixtureLiveService({
      rows: [],
      next: ['applicantWaiting'],
      failFirstLoad: false,
      now: () => NOW,
    }),
  );
  reloadOnOwnApplications(cache, () => void live.reload('user-1'));
  const mine = () => {
    const state = live.getSnapshot();
    return state.status === 'idle' ? [] : state.rows.map((item) => `${item.role}:${item.status}`);
  };
  return { cache, live, mine };
}

describe('own applications on home', () => {
  test('applying reloads the live list, so the waiting card appears without a pull', async () => {
    const { cache, live, mine } = setup();
    await live.ensureLoaded('user-1');
    expect(mine()).toEqual([]);
    cache.markApplied('bounty-1', null);
    await settle();
    expect(mine()).toEqual(['applicant:open']);
  });

  test('a change the board read from the server does not start another load', async () => {
    const { cache, live, mine } = setup();
    await live.ensureLoaded('user-1');
    cache.seed([row('bounty-1')]);
    cache.settleRow('bounty-1', true);
    await settle();
    expect(mine()).toEqual([]);
  });
});
