import { describe, expect, test } from 'bun:test';

import { pickMostUrgent } from './accessory';
import { FIXTURE_UNREAD_MESSAGES, fixtureShellFeed } from './shellFixture';

describe('fixtureShellFeed', () => {
  test('defaults to all four kinds, listed out of priority order', () => {
    const feed = fixtureShellFeed(undefined);
    expect(feed.accessory.map((item) => item.kind)).toEqual([
      'bountyInProgress',
      'owedToYou',
      'rideSoon',
      'oweMoney',
    ]);
    expect(pickMostUrgent(feed.accessory)?.item.kind).toBe('oweMoney');
    expect(feed.unreadMessages).toBe(FIXTURE_UNREAD_MESSAGES);
  });

  test('none empties the feed and the badge', () => {
    expect(fixtureShellFeed('none')).toEqual({ accessory: [], unreadMessages: 0 });
  });

  test('a list of kinds picks those items and ignores unknown names', () => {
    const feed = fixtureShellFeed('owedToYou, rideSoon,bogus');
    expect(feed.accessory.map((item) => item.kind)).toEqual(['owedToYou', 'rideSoon']);
  });
});
