import { describe, expect, test } from 'bun:test';

import { FIXTURE_UNREAD_MESSAGES, fixtureLiveItems } from './liveItems';

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
