import { describe, expect, test } from 'bun:test';

import {
  bellyMood,
  bellySegments,
  draftWaitsOnTop,
  hungryOffer,
  toBelly,
  toPantryFailure,
  withEnergy,
  type Belly,
} from './belly';
import type { Turn } from './conversation';

const NEXT = '2026-11-12T22:00:00.000Z';
const STATUS = {
  consent: { currentVersion: 1, given: true, acceptedAt: '2026-11-12T03:00:00.000Z' },
  energy: 600,
  energyFull: 1000,
  leaves: 2,
  feedsLeft: 5,
  coins: 4,
  nextRefillAt: NEXT,
};
const BELLY: Belly = {
  energy: 600,
  full: 1000,
  leaves: 2,
  coins: 4,
  feedsLeft: 5,
  nextRefillAt: NEXT,
};

describe('toBelly', () => {
  test('reads the belly part of ai_status', () => {
    expect(toBelly(STATUS)).toEqual(BELLY);
  });

  test.each([
    ['null', null],
    ['no energy', { ...STATUS, energy: undefined }],
    ['a negative count', { ...STATUS, leaves: -1 }],
    ['a fraction', { ...STATUS, coins: 1.5 }],
    ['more than full', { ...STATUS, energy: 1001 }],
    ['an empty scale', { ...STATUS, energyFull: 0 }],
    ['no feeds left field', { ...STATUS, feedsLeft: null }],
    ['a broken refill time', { ...STATUS, nextRefillAt: 'tomorrow' }],
  ])('refuses %s instead of showing an empty belly', (_, value) => {
    expect(toBelly(value)).toBeNull();
  });
});

describe('withEnergy', () => {
  test('takes the energy an answer reports', () => {
    expect(withEnergy(BELLY, { tool: 'answer', energy: 266, energyFull: 1000 })).toEqual({
      ...BELLY,
      energy: 266,
    });
  });

  test('an answer without energy changes nothing', () => {
    expect(withEnergy(BELLY, { tool: 'answer' })).toBeNull();
    expect(withEnergy(BELLY, { energy: 2000, energyFull: 1000 })).toBeNull();
  });
});

describe('segments and mood', () => {
  test.each([
    [1000, 5, 'full'],
    [801, 5, 'full'],
    [800, 4, 'ok'],
    [401, 3, 'ok'],
    [400, 2, 'half'],
    [201, 2, 'half'],
    [200, 1, 'low'],
    [1, 1, 'low'],
    [0, 0, 'hungry'],
  ] as const)('%i of 1000 is %i segments, %s', (energy, segments, mood) => {
    expect(bellySegments({ energy, full: 1000 })).toBe(segments);
    expect(bellyMood({ energy, full: 1000 })).toBe(mood);
  });
});

describe('hungryOffer', () => {
  test('a leaf in the jar is fed first', () => {
    expect(hungryOffer({ ...BELLY, energy: 0 })).toBe('feed');
  });

  test('with no leaf a coin can be swapped', () => {
    expect(hungryOffer({ ...BELLY, energy: 0, leaves: 0 })).toBe('swap');
  });

  test('with neither, come back tomorrow', () => {
    expect(hungryOffer({ ...BELLY, energy: 0, leaves: 0, coins: 0 })).toBe('tomorrow');
  });

  test('the daily cap wins over a full jar (149)', () => {
    expect(hungryOffer({ ...BELLY, energy: 0, feedsLeft: 0 })).toBe('capped');
  });
});

test('pantry refusals keep their reason; anything else is a plain failure', () => {
  expect(toPantryFailure({ message: 'fed_enough' })).toBe('fedEnough');
  expect(toPantryFailure({ message: 'no_balance' })).toBe('noBalance');
  expect(toPantryFailure({ message: 'already_full' })).toBe('alreadyFull');
  expect(toPantryFailure({ message: 'no_leaf' })).toBe('noLeaf');
  expect(toPantryFailure({ message: 'has_leaf' })).toBe('hasLeaf');
  expect(toPantryFailure({ message: 'TypeError: Network request failed' })).toBe('failed');
  expect(toPantryFailure(null)).toBe('failed');
});

test('the verify belly defaults to full when no argument is given', async () => {
  const { fixtureBelly } = await import('./fixtureAskService');
  expect(fixtureBelly(undefined)).toMatchObject({
    energy: 1000,
    leaves: 0,
    coins: 0,
    feedsLeft: 5,
  });
  expect(fixtureBelly('0,2,3,0')).toMatchObject({ energy: 0, leaves: 2, coins: 3, feedsLeft: 0 });
});

describe('draftWaitsOnTop', () => {
  const user: Turn = { role: 'user', text: '帮我取快递', via: 'typed' };
  const tapir = (reply: Extract<Turn, { role: 'tapir' }>['reply']): Turn => ({
    role: 'tapir',
    raw: {} as Extract<Turn, { role: 'tapir' }>['raw'],
    reply,
    memory: null,
  });
  const draft = tapir({ kind: 'draft', draft: { title: '取快递' } as never });

  test('a draft just made keeps the hungry card back until the next ask', () => {
    expect(draftWaitsOnTop([user, draft], false)).toBe(true);
  });

  test('a failed next ask, an answer or an open user turn shows the hungry card', () => {
    expect(draftWaitsOnTop([user, draft], true)).toBe(false);
    expect(draftWaitsOnTop([user, tapir({ kind: 'answer', text: '好' })], false)).toBe(false);
    expect(draftWaitsOnTop([user, draft, user], false)).toBe(false);
    expect(draftWaitsOnTop([], false)).toBe(false);
  });
});
