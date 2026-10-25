import { describe, expect, test } from 'bun:test';

import {
  createLiveItems,
  FIXTURE_UNREAD_MESSAGES,
  fixtureLiveItems,
  withoutMoney,
} from './liveItems';

describe('fixtureLiveItems', () => {
  test('defaults to all four kinds, listed out of priority order', () => {
    const feed = fixtureLiveItems(undefined);
    expect(feed.accessory.map((item) => item.kind)).toEqual([
      'bountyInProgress',
      'owedToYou',
      'rideSoon',
      'oweMoney',
    ]);
    expect(feed.unreadMessages).toBe(FIXTURE_UNREAD_MESSAGES);
  });

  test('none empties the feed and the badge', () => {
    expect(fixtureLiveItems('none')).toEqual({ accessory: [], unreadMessages: 0 });
  });

  test('a list of kinds picks those items and ignores unknown names', () => {
    const feed = fixtureLiveItems('owedToYou, rideSoon,bogus');
    expect(feed.accessory.map((item) => item.kind)).toEqual(['owedToYou', 'rideSoon']);
  });
});

describe('fixtureLiveItems variants', () => {
  test('worst keeps the selected kinds and ids and raises the badge past 99', () => {
    const demo = fixtureLiveItems('oweMoney,rideSoon');
    const worst = fixtureLiveItems('oweMoney,rideSoon', 'worst');
    expect(worst.accessory.map((item) => item.id)).toEqual(demo.accessory.map((item) => item.id));
    expect(worst.accessory[0].title.length).toBeGreaterThan(demo.accessory[0].title.length);
    expect(worst.unreadMessages).toBeGreaterThan(999);
  });

  test('one sets the badge to 1 and empty clears the feed', () => {
    expect(fixtureLiveItems(undefined, 'one').unreadMessages).toBe(1);
    expect(fixtureLiveItems(undefined, 'empty')).toEqual({ accessory: [], unreadMessages: 0 });
  });
});

describe('accessory amounts', () => {
  test('money items carry integer sen and keep the amount out of the title', () => {
    for (const variant of ['demo', 'worst', 'one'] as const) {
      const feed = fixtureLiveItems('oweMoney,owedToYou,rideSoon', variant).accessory;
      for (const item of feed) {
        if (item.kind === 'rideSoon') {
          expect(item.amountSen).toBeUndefined();
          continue;
        }
        expect(Number.isInteger(item.amountSen)).toBe(true);
        expect(item.title).not.toMatch(/RM/);
      }
    }
  });

  test('worst amounts are 12,345.60 and 0.50', () => {
    const feed = fixtureLiveItems('oweMoney,owedToYou', 'worst').accessory;
    expect(feed.map((item) => item.amountSen)).toEqual([50, 1234560]);
  });
});

describe('live item sources', () => {
  test('a source adds its items after the base feed and replaces them on the next publish', () => {
    const live = createLiveItems(withoutMoney(fixtureLiveItems('oweMoney,rideSoon')));
    expect(live.getSnapshot().accessory.map((item) => item.kind)).toEqual(['rideSoon']);
    const owe = {
      id: 'p1',
      kind: 'oweMoney',
      title: '付给阿杰',
      amountSen: 1500,
      sub: '帮取快递',
    } as const;
    live.setSource('payments', [owe]);
    expect(live.getSnapshot().accessory.map((item) => item.id)).toEqual(['fixture-ride', 'p1']);
    live.setSource('payments', []);
    expect(live.getSnapshot().accessory.map((item) => item.id)).toEqual(['fixture-ride']);
  });

  test('an empty first source does not notify', () => {
    const live = createLiveItems();
    let calls = 0;
    live.subscribe(() => (calls += 1));
    live.setSource('payments', []);
    expect(calls).toBe(0);
  });
});
