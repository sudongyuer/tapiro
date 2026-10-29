import { describe, expect, test } from 'bun:test';

import {
  accessoryPriority,
  type AccessoryItem,
  type AccessoryKind,
  fixtureLiveItems,
} from '@/lib/liveItems';

import { accessoryVisible, badgeText, pickMostUrgent } from './accessory';

const item = (id: string, kind: AccessoryKind): AccessoryItem => ({
  id,
  kind,
  title: id,
  sub: '',
});

describe('pickMostUrgent', () => {
  test('picks money owed from the default fixture feed', () => {
    expect(pickMostUrgent(fixtureLiveItems(undefined).accessory)?.item.kind).toBe('oweMoney');
  });

  test('returns null when there is nothing', () => {
    expect(pickMostUrgent([])).toBeNull();
  });

  test('money owed beats a ride, money owed to you and a bounty in progress', () => {
    const result = pickMostUrgent([
      item('bounty', 'bountyInProgress'),
      item('owed', 'owedToYou'),
      item('ride', 'rideSoon'),
      item('owe', 'oweMoney'),
    ]);
    expect(result).toEqual({ item: item('owe', 'oweMoney'), more: 3 });
  });

  test('a ride within the hour beats money owed to you', () => {
    expect(pickMostUrgent([item('owed', 'owedToYou'), item('ride', 'rideSoon')])?.item.id).toBe(
      'ride',
    );
  });

  test('keeps the feed order within one kind', () => {
    expect(pickMostUrgent([item('a', 'owedToYou'), item('b', 'owedToYou')])?.item.id).toBe('a');
  });

  test('a single item has nothing more', () => {
    expect(pickMostUrgent([item('a', 'bountyInProgress')])?.more).toBe(0);
  });

  test('priorities follow the spec order', () => {
    expect(
      (
        [
          'oweMoney',
          'rideSoon',
          'owedToYou',
          'bountyAction',
          'bountyInProgress',
          'waitingConfirm',
        ] as const
      ).map(accessoryPriority),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('accessoryVisible', () => {
  test('hidden when there is no item', () => {
    expect(accessoryVisible({ hasItem: false, onHomeRoot: false, liveCardsOnScreen: false })).toBe(
      false,
    );
  });

  test('hidden at the top of the home tab while the live cards are on screen', () => {
    expect(accessoryVisible({ hasItem: true, onHomeRoot: true, liveCardsOnScreen: true })).toBe(
      false,
    );
  });

  test('shown on home once the live cards scroll away', () => {
    expect(accessoryVisible({ hasItem: true, onHomeRoot: true, liveCardsOnScreen: false })).toBe(
      true,
    );
  });

  test('shown on other tabs whatever the home scroll state', () => {
    expect(accessoryVisible({ hasItem: true, onHomeRoot: false, liveCardsOnScreen: true })).toBe(
      true,
    );
  });
});

describe('badgeText', () => {
  test('no badge at zero', () => {
    expect(badgeText(0)).toBeNull();
  });

  test('caps large counts', () => {
    expect(badgeText(3)).toBe('3');
    expect(badgeText(120)).toBe('99+');
  });
});
