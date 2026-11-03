import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createSupabaseRideDetailService,
  toPaymentFailure,
  toReachedPhase,
  toReceived,
} from './detailService';
import { createFixtureRideDetailService } from './fixtureDetailService';
import { FIXTURE_VIEWER } from './fixtureDetails';
import { toRideDetail } from './parseDetail';

const NOW = Date.parse('2026-11-02T23:40:00Z');

const settled = {
  id: 'r1',
  start: { label: 'Sunway Geo', short: '双威', kind: 'home' },
  dest: { label: 'KLIA2', short: 'KLIA2', kind: 'airport' },
  departAt: '2026-11-02T22:30:00Z',
  day: '2026-11-03',
  status: 'settling',
  seats: 4,
  taken: 3,
  splitMode: 'tapiro',
  estimate: null,
  airport: true,
  role: 'member',
  myStatus: 'boarded',
  createdAt: '2026-11-02T13:04:00Z',
  startPoint: { latitude: 3.07, longitude: 101.6 },
  currency: 'CNY',
  myShare: 2470,
  sticker: null,
  settle: {
    totalMinor: 7400,
    currency: 'CNY',
    organiserShare: 2460,
    sentAt: '2026-11-02T23:26:00Z',
    receipt: 'r1/grab.jpg',
    riders: [
      { id: 'm1', name: '阿明', tier: 'reliable', minor: 2470, paid: 'paid' },
      {
        id: FIXTURE_VIEWER,
        name: '小雅',
        tier: 'reliable',
        minor: 2470,
        paid: 'due',
        paymentId: 'p2',
        dueSince: '2026-11-02T23:26:00Z',
        dispute: { note: null, at: '2026-11-02T23:30:00Z' },
      },
    ],
  },
};

describe('settle reads', () => {
  test("the split, each paid status and the rider's own share parse in the ride currency", () => {
    const ride = toRideDetail(settled);
    expect(ride.currency).toBe('CNY');
    expect(ride.myShare).toEqual({ minor: 2470, currency: 'CNY' });
    expect(ride.settle?.total).toEqual({ minor: 7400, currency: 'CNY' });
    expect(ride.settle?.riders.map((r) => [r.paid, r.paymentId])).toEqual([
      ['paid', null],
      ['due', 'p2'],
    ]);
    expect(ride.settle?.riders[1].dispute).toEqual({ note: null, at: '2026-11-02T23:30:00.000Z' });
  });

  test('an unknown paid state fails the read instead of guessing', () => {
    const broken = {
      ...settled,
      settle: { ...settled.settle, riders: [{ ...settled.settle.riders[0], paid: 'maybe' }] },
    };
    expect(() => toRideDetail(broken)).toThrow();
  });

  test('a ride without a split has no settle block and no share', () => {
    const ride = toRideDetail({ ...settled, settle: null, myShare: null });
    expect(ride.settle).toBeNull();
    expect(ride.myShare).toBeNull();
  });
});

describe('settle writes', () => {
  test('到了 answers the new phase; 已收到 answers whether the ride closed', () => {
    expect(toReachedPhase({ status: 'arrived' })).toBe('arrived');
    expect(() => toReachedPhase({})).toThrow();
    expect(
      toReceived({ state: 'settled', rideSettled: true, firstSettled: true, stickerCount: 4 }),
    ).toEqual({
      rideSettled: true,
      firstSettled: true,
      stickerCount: 4,
    });
    expect(() => toReceived({ state: 'due' })).toThrow();
  });

  test('a refused 已收到 reloads; a network failure keeps the screen as it was', () => {
    expect(toPaymentFailure({ code: '55000' })).toBe('transition');
    expect(toPaymentFailure({ code: 'P0002' })).toBe('transition');
    expect(toPaymentFailure({ message: 'fetch failed' })).toBe('failed');
  });

  test('the split is sent once with every rider and the receipt path', async () => {
    const calls: { name: string; args: unknown }[] = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push({ name, args });
        return { data: null, error: null };
      },
    } as unknown as SupabaseClient;
    const service = createSupabaseRideDetailService(client, () => 'MYR');
    const answer = await service.sendSplit('r1', {
      totalMinor: 7400,
      shares: [{ memberId: 'm1', minor: 2470 }],
      receipt: 'r1/a.jpg',
    });
    expect(answer.ok).toBe(true);
    expect(calls).toEqual([
      {
        name: 'send_ride_split',
        args: {
          ride: 'r1',
          total_minor: 7400,
          shares: [{ memberId: 'm1', minor: 2470 }],
          receipt: 'r1/a.jpg',
        },
      },
    ]);
  });
});

describe('the settle fixture', () => {
  const options = {
    fail: 'none' as const,
    variant: 'demo' as const,
    now: () => NOW,
    delayMs: 0,
  };

  test('到了 then the split moves the organiser to 结清; the last 已收到 closes with a sticker', async () => {
    const service = createFixtureRideDetailService({ ...options, scene: 'reach' });
    expect(await service.reach('r')).toEqual({ ok: true, value: 'arrived' });
    const ride = await service.load('r');
    const riders = ride.members?.filter((m) => m.status === 'boarded' && !m.organiser) ?? [];
    await service.sendSplit('r', {
      totalMinor: 7400,
      shares: riders.map((m) => ({ memberId: m.id, minor: 2470 })),
      receipt: null,
    });
    const split = await service.load('r');
    expect(split.status).toBe('settling');
    expect(split.settle?.organiserShare?.minor).toBe(2460);
    const [first, last] = split.settle?.riders ?? [];
    const one = await service.confirmReceived('r', first.paymentId ?? '');
    expect(one.ok && one.value.rideSettled).toBe(false);
    const two = await service.confirmReceived('r', last.paymentId ?? '');
    expect(two.ok && two.value.rideSettled).toBe(true);
    const done = await service.load('r');
    expect(done.status).toBe('closed');
    expect(done.sticker?.collected).toBe(false);
  });

  test('a Grab-split ride settles at 到了', async () => {
    const service = createFixtureRideDetailService({ ...options, scene: 'reachGrab' });
    expect(await service.reach('r')).toEqual({ ok: true, value: 'closed' });
  });

  test('a failed receipt upload throws once, then the retry uploads', async () => {
    const service = createFixtureRideDetailService({ ...options, scene: 'reach', fail: 'receipt' });
    await expect(service.uploadReceipt('r', 'file:///x.jpg')).rejects.toThrow();
    expect(await service.uploadReceipt('r', 'file:///x.jpg')).toBe('r/fixture-receipt.jpg');
  });
});
