import { describe, expect, test } from 'bun:test';

import { pickMostUrgent } from '@/features/shell/accessory';

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
    expect(pickMostUrgent(feed.accessory)?.item.kind).toBe('oweMoney');
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
