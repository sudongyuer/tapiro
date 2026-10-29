import { describe, expect, test } from 'bun:test';

import {
  createFixturePostService,
  FIXTURE_UNPAID_IDS,
  fixturePostOptions,
  type FixturePostOptions,
} from './fixturePostService';
import type { PublishArgs } from './types';

const NOW = new Date('2026-10-27T04:00:00.000Z');
const DAY = 86_400_000;

const options = (patch: Partial<FixturePostOptions> = {}): FixturePostOptions => ({
  ...fixturePostOptions(
    () => undefined,
    'demo',
    () => NOW,
  ),
  ...patch,
});

const args = (id: string): PublishArgs => ({
  id,
  title: '帮我取个快递',
  category: 'pickup',
  reward_minor: 800,
  reward_currency: 'MYR',
  description: null,
  place_label: null,
  latitude: null,
  longitude: null,
  address: null,
  starts_at: null,
  ends_at: null,
  deadline_at: null,
});

describe('launch arguments', () => {
  test('defaults: free, nothing unpaid, publish ok, status loads', () => {
    expect(options()).toMatchObject({
      cost: 'free',
      unpaid: 'none',
      publish: 'ok',
      statusFail: false,
    });
  });

  test('reads every argument and ignores unknown values', () => {
    const read = (values: Record<string, string>) =>
      fixturePostOptions(
        (name) => values[name],
        'demo',
        () => NOW,
      );
    expect(
      read({
        uiVerifyPostCost: 'coin',
        uiVerifyUnpaid: 'old',
        uiVerifyPublish: 'failOnce',
        uiVerifyStatusFail: '1',
        uiVerifyDraftSent: '1',
      }),
    ).toMatchObject({
      cost: 'coin',
      unpaid: 'old',
      publish: 'failOnce',
      statusFail: true,
      draftSent: true,
    });
    expect(
      read({
        uiVerifyPostCost: 'lots',
        uiVerifyUnpaid: 'many',
        uiVerifyPublish: 'maybe',
        uiVerifyStatusFail: 'yes',
      }),
    ).toMatchObject({ cost: 'free', unpaid: 'none', publish: 'ok', statusFail: false });
  });
});

describe('status', () => {
  test.each([
    ['free', 2, 0],
    ['last', 1, 0],
    ['coin', 0, 4],
    ['none', 0, 0],
  ] as const)('cost %s → %d free, %d coins', async (cost, freePostsLeft, coins) => {
    expect(await createFixturePostService(options({ cost })).status()).toEqual({
      blocked: false,
      unpaid: [],
      coins,
      freePostsLeft,
      freePostsPerMonth: 3,
      nextFreeAt: '2026-10-31T16:00:00.000Z',
    });
  });

  test('two unpaid payments block, oldest is 阿杰', async () => {
    const status = await createFixturePostService(options({ unpaid: 'two' })).status();
    expect(status.blocked).toBe(true);
    expect(
      status.unpaid.map(({ paymentId, payeeName, amount }) => [paymentId, payeeName, amount.minor]),
    ).toEqual([
      [FIXTURE_UNPAID_IDS.first, '阿杰', 1500],
      [FIXTURE_UNPAID_IDS.second, 'Lily', 600],
    ]);
  });

  test('one old payment blocks and is eight days old', async () => {
    const status = await createFixturePostService(options({ unpaid: 'old' })).status();
    expect(status.blocked).toBe(true);
    expect(status.unpaid).toHaveLength(1);
    expect(NOW.getTime() - Date.parse(status.unpaid[0].createdAt)).toBe(8 * DAY);
  });

  test('the worst variant names long payees with large amounts', async () => {
    const status = await createFixturePostService(
      options({ unpaid: 'two', variant: 'worst' }),
    ).status();
    expect(status.unpaid.every((item) => item.payeeName.length >= 39)).toBe(true);
    expect(status.unpaid[0].amount).toEqual({ minor: 1234560, currency: 'MYR' });
  });

  test('status fail throws once, then loads', async () => {
    const service = createFixturePostService(options({ statusFail: true }));
    await expect(service.status()).rejects.toThrow('Network request failed');
    expect((await service.status()).freePostsLeft).toBe(2);
  });
});

describe('publish', () => {
  test('ok spends a free slot and a repeated id returns the first outcome', async () => {
    const service = createFixturePostService(options({ cost: 'last' }));
    const first = await service.publish(args('a'));
    expect(first).toEqual({
      ok: true,
      result: { id: 'a', status: 'open', charge: 'free', expiresAt: '2026-11-03T04:00:00.000Z' },
    });
    expect(await service.publish(args('a'))).toEqual(first);
    expect(service.published()).toEqual(['a']);
    expect((await service.status()).freePostsLeft).toBe(0);
  });

  test('an accepted publish reports its arguments, coordinates included', async () => {
    const reported: PublishArgs[] = [];
    const service = createFixturePostService(options({ publish: 'failOnce' }), (sent) =>
      reported.push(sent),
    );
    const placed = {
      ...args('a'),
      place_label: 'Sunway Pyramid',
      latitude: 3.0733,
      longitude: 101.6078,
    };
    await service.publish(placed);
    expect(reported).toEqual([]);
    await service.publish(placed);
    await service.publish(placed);
    expect(reported).toEqual([placed]);
  });

  test('coin cost charges a coin', async () => {
    const service = createFixturePostService(options({ cost: 'coin' }));
    const outcome = await service.publish(args('a'));
    expect(outcome.ok && outcome.result.charge).toBe('coin');
    expect((await service.status()).coins).toBe(3);
  });

  test('no slot and no coin rejects noBalance', async () => {
    const service = createFixturePostService(options({ cost: 'none' }));
    expect(await service.publish(args('a'))).toEqual({ ok: false, reason: 'noBalance' });
    expect(service.published()).toEqual([]);
  });

  test.each(['two', 'old'] as const)('unpaid %s rejects blocked', async (unpaid) => {
    const service = createFixturePostService(options({ unpaid }));
    expect(await service.publish(args('a'))).toEqual({ ok: false, reason: 'blocked' });
    expect(service.published()).toEqual([]);
  });

  test('failOnce fails the first call, then the same id publishes once', async () => {
    const service = createFixturePostService(options({ publish: 'failOnce' }));
    expect(await service.publish(args('a'))).toEqual({ ok: false, reason: 'failed' });
    expect(service.published()).toEqual([]);
    const second = await service.publish(args('a'));
    expect(second.ok).toBe(true);
    expect(await service.publish(args('a'))).toEqual(second);
    expect(service.published()).toEqual(['a']);
    expect((await service.status()).freePostsLeft).toBe(1);
  });

  test('fail always fails', async () => {
    const service = createFixturePostService(options({ publish: 'fail' }));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(await service.publish(args('a'))).toEqual({ ok: false, reason: 'failed' });
    }
    expect(service.published()).toEqual([]);
  });

  test('the deadline becomes the expiry', async () => {
    const outcome = await createFixturePostService(options()).publish({
      ...args('a'),
      deadline_at: '2026-10-27T10:00:00.000Z',
    });
    expect(outcome.ok && outcome.result.expiresAt).toBe('2026-10-27T10:00:00.000Z');
  });

  test('alreadySent rejects and publishes nothing', async () => {
    const service = createFixturePostService(options({ publish: 'alreadySent' }));
    expect(await service.publish(args('a'))).toEqual({ ok: false, reason: 'alreadySent' });
    expect(service.published()).toEqual([]);
  });
});

describe('isPublished', () => {
  test('an accepted id is published, another is not', async () => {
    const service = createFixturePostService(options());
    await service.publish(args('a'));
    expect(await service.isPublished('a')).toBe(true);
    expect(await service.isPublished('b')).toBe(false);
  });

  test('draftSent marks only the first draft asked about as published', async () => {
    const service = createFixturePostService(options({ draftSent: true }));
    expect(await service.isPublished('seeded')).toBe(true);
    expect(await service.isPublished('next')).toBe(false);
    expect(await service.isPublished('seeded')).toBe(true);
  });
});
