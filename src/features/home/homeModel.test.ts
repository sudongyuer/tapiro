import { describe, expect, test } from 'bun:test';

import type { AccessoryItem, AccessoryKind } from '@/features/shell';

import {
  liveCards,
  moneyParts,
  moneyText,
  stageLine,
  stageState,
  type CardDetail,
} from './homeModel';

const PRIORITY: AccessoryKind[] = ['oweMoney', 'rideSoon', 'owedToYou', 'bountyInProgress'];
const priority = (kind: AccessoryKind) => PRIORITY.indexOf(kind) + 1;

const item = (kind: AccessoryKind): AccessoryItem => ({ id: kind, kind, title: kind, sub: '' });
const owe = item('oweMoney');
const ride = item('rideSoon');
const owed = item('owedToYou');
const progress = item('bountyInProgress');

const DETAILS: Record<string, CardDetail> = {
  oweMoney: { kind: 'oweMoney', payee: '阿杰', amount: 15, note: '', category: 'pickup' },
  rideSoon: {
    kind: 'rideSoon',
    departAt: '17:00',
    route: '',
    countdown: '08:42',
    minutesLeft: 8,
    seats: '4/4',
    youBook: true,
    meet: '',
    destination: '',
    progress: 0.4,
    riders: [],
  },
  owedToYou: { kind: 'owedToYou', payer: '小林', amount: 8, note: '', category: 'buy' },
  bountyInProgress: {
    kind: 'bountyInProgress',
    helper: 'Aiman',
    when: '',
    title: '',
    amount: 20,
    category: 'study',
  },
};

describe('stageState', () => {
  test('owing money is urgent', () => {
    expect(stageState([progress, owe])).toBe('urgent');
  });

  test('anything else live is in progress', () => {
    expect(stageState([ride])).toBe('live');
    expect(stageState([owed, progress])).toBe('live');
  });

  test('nothing pending is calm', () => {
    expect(stageState([])).toBe('calm');
  });
});

describe('liveCards', () => {
  test('cards follow the accessory priority and carry their detail', () => {
    const cards = liveCards([progress, owed, ride, owe], DETAILS, priority);
    expect(cards.map((card) => card.kind)).toEqual(PRIORITY);
    expect(cards.every((card) => card.kind === 'calm' || card.detail?.kind === card.kind)).toBe(
      true,
    );
  });

  test('no items leaves the calm card', () => {
    expect(liveCards([], DETAILS, priority)).toEqual([{ kind: 'calm', id: 'calm' }]);
  });

  test('a detail of another kind is ignored', () => {
    const [card] = liveCards([ride], { rideSoon: DETAILS.oweMoney }, priority);
    expect(card.kind === 'rideSoon' && card.detail).toBeNull();
  });
});

describe('stageLine', () => {
  test('names the person the front card is about', () => {
    expect(stageLine(liveCards([ride, owe], DETAILS, priority))).toEqual({
      key: 'payNamed',
      name: '阿杰',
    });
    expect(stageLine(liveCards([ride], DETAILS, priority))).toEqual({
      key: 'rideMinutes',
      count: 8,
    });
    expect(stageLine(liveCards([progress], DETAILS, priority))).toEqual({
      key: 'progressNamed',
      name: 'Aiman',
    });
  });

  test('falls back to a plain line without detail', () => {
    expect(stageLine(liveCards([owe], {}, priority))).toEqual({ key: 'pay' });
    expect(stageLine(liveCards([progress], {}, priority))).toEqual({ key: 'live' });
    expect(stageLine(liveCards([], {}, priority))).toEqual({ key: 'calm' });
  });
});

describe('money', () => {
  test('splits whole and cents with two decimals', () => {
    expect(moneyParts(15)).toEqual({ whole: '15', cents: '.00' });
    expect(moneyParts(15.5)).toEqual({ whole: '15', cents: '.50' });
  });

  test('short text drops zero cents only', () => {
    expect(moneyText(15)).toBe('15');
    expect(moneyText(15.5)).toBe('15.50');
  });
});
