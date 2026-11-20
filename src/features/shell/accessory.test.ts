import { describe, expect, test } from 'bun:test';

import {
  ACCESSORY_KINDS,
  accessoryPriority,
  type AccessoryItem,
  type AccessoryKind,
  type BountyCardDetail,
  fixtureLiveItems,
} from '@/lib/liveItems';

import { accessoryTarget, accessoryVisible, badgeText, pickMostUrgent } from './accessory';

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
    expect(result?.item.id).toBe('owe');
    expect(result?.more).toBe(3);
  });

  test('a settled card never takes the accessory and is not counted in more', () => {
    expect(pickMostUrgent([item('done', 'settled')])).toBeNull();
    const result = pickMostUrgent([
      item('done', 'settled'),
      item('waiting', 'waitingConfirm'),
      item('progress', 'bountyInProgress'),
    ]);
    expect(result?.item.id).toBe('progress');
    expect(result?.more).toBe(1);
  });

  test('with every kind present the accessory shows money owed and counts the rest but settled', () => {
    const result = pickMostUrgent([...ACCESSORY_KINDS].reverse().map((kind) => item(kind, kind)));
    expect(result?.item.kind).toBe('oweMoney');
    expect(result?.more).toBe(ACCESSORY_KINDS.length - 2);
  });

  test('the item whose screen is on top leaves the strip to the next one', () => {
    const choose = {
      ...item('choose', 'bountyAction'),
      bounty: { target: '/bounty/applicants/b1' } as BountyCardDetail,
    };
    const progress = item('progress', 'bountyInProgress');
    const next = pickMostUrgent([choose, progress], '/bounty/applicants/b1');
    expect([next?.item.id, next?.more]).toEqual(['progress', 0]);
    expect(pickMostUrgent([choose], '/bounty/applicants/b1')).toBeNull();
    expect(pickMostUrgent([choose, progress], '/bounty/b1')?.item.id).toBe('choose');
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
          'settled',
          'bountyInProgress',
          'waitingConfirm',
        ] as const
      ).map(accessoryPriority),
    ).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('accessoryTarget', () => {
  test('a bounty waiting for the poster to choose opens its applicants in the bounty tab', () => {
    const choose = {
      ...item('choose', 'bountyAction'),
      bounty: { target: '/bounty/applicants/b1' } as BountyCardDetail,
    };
    expect(accessoryTarget(choose)).toEqual({
      href: '/bounty/applicants/b1',
      inBountyTab: true,
    });
  });

  test('money owed opens its pay sheet', () => {
    const owe = { ...item('owe', 'oweMoney'), payment: { id: 'p1', counterpart: 'A', note: '' } };
    expect(accessoryTarget(owe)).toEqual({ href: '/pay/p1', inBountyTab: false });
  });

  test('an item without a screen of its own has no target', () => {
    expect(accessoryTarget(item('ride', 'rideSoon'))).toBeNull();
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
