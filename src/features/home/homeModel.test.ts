import { describe, expect, test } from 'bun:test';

import {
  accessoryPriority,
  type AccessoryItem,
  type AccessoryKind,
  type BountyCardDetail,
  type CardDetail,
} from '@/lib/liveItems';

import { createSeenMarks, liveCards, shownOneTimeCards, stageLine, stageState } from './homeModel';

const PRIORITY: AccessoryKind[] = ['oweMoney', 'rideSoon', 'owedToYou', 'bountyInProgress'];
const priority = (kind: AccessoryKind) => PRIORITY.indexOf(kind) + 1;

const bounty = (kind: BountyCardDetail['kind'], extra: Partial<BountyCardDetail> = {}) => {
  const detail: BountyCardDetail = {
    kind,
    role: 'poster',
    bountyId: `b-${kind}`,
    title: '帮取快递',
    category: 'pickup',
    reward: { minor: 800, currency: 'MYR' },
    counterpart: '阿杰',
    line: '阿杰在路上 · 17:40 到',
    target: `/bounty/status/b-${kind}`,
    ...extra,
  };
  return { id: `b-${kind}`, kind, title: detail.title, sub: detail.line, bounty: detail };
};

const item = (kind: AccessoryKind): AccessoryItem => ({ id: kind, kind, title: kind, sub: '' });
const owe = item('oweMoney');
const ride = item('rideSoon');
const owed = item('owedToYou');
const progress = bounty('bountyInProgress');

const DETAILS: Record<string, CardDetail> = {
  oweMoney: {
    kind: 'oweMoney',
    paymentId: null,
    payee: '阿杰',
    amount: { minor: 1500, currency: 'MYR' },
    note: '',
    category: 'pickup',
  },
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
  owedToYou: {
    kind: 'owedToYou',
    payer: '小林',
    amount: { minor: 800, currency: 'MYR' },
    note: '',
    category: 'buy',
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
    expect(cards.every((card) => !('detail' in card) || card.detail?.kind === card.kind)).toBe(
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
      key: 'bounty',
      title: '帮取快递',
      line: '阿杰在路上 · 17:40 到',
    });
  });

  test('falls back to a plain line without detail', () => {
    expect(stageLine(liveCards([owe], {}, priority))).toEqual({ key: 'pay' });
    expect(stageLine(liveCards([item('bountyInProgress')], {}, priority))).toEqual({
      key: 'live',
    });
    expect(stageLine(liveCards([], {}, priority))).toEqual({ key: 'calm' });
  });
});

describe('payment-driven cards', () => {
  const paid = (kind: AccessoryKind): AccessoryItem => ({
    id: `p-${kind}`,
    kind,
    title: kind,
    sub: '',
    amount: { minor: 1500, currency: 'MYR' },
    payment: { id: `p-${kind}`, counterpart: '阿杰', note: '帮取快递' },
  });

  test('a payment item without fixture details builds its card from the payment', () => {
    const [pay, owedCard] = liveCards([paid('oweMoney'), paid('owedToYou')], {}, priority);
    expect('detail' in pay && pay.detail).toEqual({
      kind: 'oweMoney',
      paymentId: 'p-oweMoney',
      payee: '阿杰',
      amount: { minor: 1500, currency: 'MYR' },
      note: '帮取快递',
      category: 'other',
    });
    expect('detail' in owedCard && owedCard.detail).toMatchObject({
      kind: 'owedToYou',
      payer: '阿杰',
    });
  });

  test('fixture details keep their copy and take the payment id from the item', () => {
    const [card] = liveCards([{ ...paid('oweMoney'), id: 'oweMoney' }], DETAILS, priority);
    expect('detail' in card && card.detail).toMatchObject({
      payee: '阿杰',
      paymentId: 'p-oweMoney',
      category: 'pickup',
    });
  });
});

describe('payments that are not known', () => {
  test('a failed source shows the unavailable card instead of calm and keeps the stage off calm', () => {
    const issues = [{ source: 'payments', status: 'failed' } as const];
    expect(liveCards([], DETAILS, priority, issues)).toEqual([
      { kind: 'unavailable', id: 'unavailable', issue: issues[0] },
    ]);
    expect(stageState([], issues)).toBe('live');
  });

  test('a stale source puts the unavailable card in front of the other live items', () => {
    const issues = [{ source: 'payments', status: 'stale' } as const];
    expect(liveCards([ride], DETAILS, priority, issues).map((card) => card.kind)).toEqual([
      'unavailable',
      'rideSoon',
    ]);
  });

  test('loading shows a loading card only while there is nothing else', () => {
    const issues = [{ source: 'payments', status: 'loading' } as const];
    expect(liveCards([], DETAILS, priority, issues)[0].kind).toBe('unavailable');
    expect(liveCards([ride], DETAILS, priority, issues).map((card) => card.kind)).toEqual([
      'rideSoon',
    ]);
  });
});

describe('bounty cards', () => {
  const action = bounty('bountyAction', { line: '3 人申请，去选', actionLabel: '去选人' });
  const waiting = bounty('waitingConfirm', { line: '等人申请' });

  test('a bounty that needs you ranks after money owed to you and before one in progress', () => {
    const cards = liveCards(
      [waiting, progress, action, owed, ride, owe],
      DETAILS,
      accessoryPriority,
    );
    expect(cards.map((card) => card.kind)).toEqual([
      'oweMoney',
      'rideSoon',
      'owedToYou',
      'bountyAction',
      'bountyInProgress',
      'waitingConfirm',
    ]);
  });

  test('each bounty card carries the detail its item published', () => {
    const [card] = liveCards([action], {}, accessoryPriority);
    expect('detail' in card && card.detail).toBe(action.bounty);
  });

  test('a front bounty card puts its title and step on the stage', () => {
    expect(stageLine(liveCards([waiting, action], {}, accessoryPriority))).toEqual({
      key: 'bounty',
      title: '帮取快递',
      line: '3 人申请，去选',
    });
  });
});

describe('one-time cards', () => {
  const oneTime = (id: string, markSeen: () => Promise<void>) =>
    bounty('waitingConfirm', { bountyId: id, oneTime: 'not_selected', markSeen });

  test('only the front card counts as shown while stacked; every card once fanned out', () => {
    const seen = async () => undefined;
    const cards = liveCards(
      [bounty('bountyAction'), { ...oneTime('x', seen), id: 'x' }],
      {},
      accessoryPriority,
    );
    expect(shownOneTimeCards(cards, false)).toEqual([]);
    expect(shownOneTimeCards(cards, true).map((card) => card.id)).toEqual(['x']);
  });

  test('marks a shown card once per launch across renders and redisplays', async () => {
    const calls: string[] = [];
    const card = { ...oneTime('x', async () => void calls.push('x')), id: 'x' };
    const mark = createSeenMarks();
    const shown = shownOneTimeCards(liveCards([card], {}, accessoryPriority), false);
    mark(shown);
    mark(shown);
    await new Promise((resolve) => setTimeout(resolve, 0));
    mark([]);
    mark(shown);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual(['x']);
  });

  test('a failed mark is retried on the next display, not while it stays shown', async () => {
    let attempts = 0;
    const card = {
      ...oneTime('y', async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('offline');
      }),
      id: 'y',
    };
    const mark = createSeenMarks();
    const shown = shownOneTimeCards(liveCards([card], {}, accessoryPriority), false);
    mark(shown);
    await new Promise((resolve) => setTimeout(resolve, 0));
    mark(shown);
    expect(attempts).toBe(1);
    mark([]);
    mark(shown);
    await new Promise((resolve) => setTimeout(resolve, 0));
    mark([]);
    mark(shown);
    expect(attempts).toBe(2);
  });
});
