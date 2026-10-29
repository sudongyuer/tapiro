import { describe, expect, test } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseStatusService } from './statusService';
import type { CancelPreview, StatusService } from './types';

type Answer = { data?: unknown; error?: unknown };

function stubClient(answer: (name: string, args: unknown) => Answer | Promise<never>) {
  const calls: { name: string; args: unknown }[] = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      return answer(name, args);
    },
  } as unknown as SupabaseClient;
  return { service: createSupabaseStatusService(client, () => 'CNY'), calls };
}

const ok = (data: unknown): Answer => ({ data, error: null });
const rejected = (message: string, code = '55000'): Answer => ({
  data: null,
  error: { message, code },
});
const offline = () => Promise.reject(new TypeError('Network request failed'));

const EVENT = {
  kind: 'started',
  at: '2026-10-29T03:20:00+00:00',
  actor: 'helper',
  from: 'assigned',
  to: 'en_route',
  etaAt: '2026-10-29T04:10:00+00:00',
  previousEtaAt: null,
  reason: null,
};

const ROW = {
  id: 'b1',
  title: '帮取快递',
  description: null,
  category: 'pickup',
  rewardMinor: 800,
  rewardCurrency: 'MYR',
  status: 'en_route',
  viewerRole: 'poster',
  place: null,
  distanceM: null,
  address: 'Block B 23-07',
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  expiresAt: '2026-11-05T03:00:00+00:00',
  publishedAt: '2026-10-29T02:00:00+00:00',
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
  helper: { id: 'h1', name: '阿杰', tier: 'very_reliable' },
  myApplication: null,
  applicantCount: 0,
  etaAt: '2026-10-29T04:10:00+00:00',
  previousEtaAt: null,
  autoConfirmAt: null,
  startLate: false,
  issueReason: null,
  payment: null,
  events: [EVENT],
};

const PAYMENT = {
  id: 'pay1',
  state: 'marked_paid',
  amountMinor: 5000,
  currency: 'CNY',
  converted: { minor: 3061, currency: 'MYR' },
};

describe('detail', () => {
  test('calls bounty_detail with the bounty and the reference currency and parses the status keys', async () => {
    const stub = stubClient(() => ok({ ...ROW, charge: 'coin', payment: PAYMENT }));
    const detail = await stub.service.detail('b1');
    expect(stub.calls).toEqual([
      { name: 'bounty_detail', args: { bounty: 'b1', reference_currency: 'CNY' } },
    ]);
    expect(detail).toMatchObject({
      id: 'b1',
      status: 'en_route',
      viewerRole: 'poster',
      helper: { id: 'h1', name: '阿杰', tier: 'very_reliable' },
      etaAt: '2026-10-29T04:10:00+00:00',
      previousEtaAt: null,
      autoConfirmAt: null,
      startLate: false,
      issueReason: null,
      payment: {
        id: 'pay1',
        state: 'marked_paid',
        amount: { minor: 5000, currency: 'CNY' },
        converted: { minor: 3061, currency: 'MYR' },
      },
      charge: 'coin',
      events: [EVENT],
    });
  });

  test('a payment without a locked rate has no conversion', async () => {
    const detail = await stubClient(() =>
      ok({ ...ROW, payment: { ...PAYMENT, converted: null } }),
    ).service.detail('b1');
    expect(detail).toMatchObject({ payment: { converted: null } });
  });

  test('charge is null when the server has not added it yet', async () => {
    const detail = await stubClient(() => ok(ROW)).service.detail('b1');
    expect(detail).toMatchObject({ charge: null });
  });

  test('a settled status is accepted', async () => {
    expect(
      await stubClient(() => ok({ ...ROW, status: 'settled' })).service.detail('b1'),
    ).toMatchObject({ status: 'settled' });
  });

  test.each(['applicant', 'viewer'])(
    'a %s is not a party and reads as unavailable',
    async (role) => {
      expect(await stubClient(() => ok({ ...ROW, viewerRole: role })).service.detail('b1')).toBe(
        'unavailable',
      );
    },
  );

  test.each([
    ['status', { ...ROW, status: 'paused' }],
    ['startLate', { ...ROW, startLate: null }],
    ['events', { ...ROW, events: null }],
    ['event.kind', { ...ROW, events: [{ ...EVENT, kind: 'teleported' }] }],
    ['event.actor', { ...ROW, events: [{ ...EVENT, actor: 'stranger' }] }],
    ['event.at', { ...ROW, events: [{ ...EVENT, at: null }] }],
    ['payment.state', { ...ROW, payment: { ...PAYMENT, state: 'lost' } }],
    ['payment.amount', { ...ROW, payment: { ...PAYMENT, currency: 'USD' } }],
    ['payment.converted', { ...ROW, payment: { ...PAYMENT, converted: { minor: 1.5 } } }],
    ['charge', { ...ROW, charge: 'cash' }],
    ['etaAt', { ...ROW, etaAt: 5 }],
  ])('a malformed %s rejects', async (what, bad) => {
    await expect(stubClient(() => ok(bad)).service.detail('b1')).rejects.toThrow(what);
  });

  test('not found, not helper and not poster are unavailable; other errors throw', async () => {
    for (const [message, code] of [
      ['bounty_not_found', 'P0002'],
      ['not_helper', '42501'],
      ['not_poster', '42501'],
      ['anything', 'P0002'],
    ]) {
      expect(await stubClient(() => rejected(message, code)).service.detail('b1')).toBe(
        'unavailable',
      );
    }
    await expect(
      stubClient(() => rejected('boom', 'XX000')).service.detail('b1'),
    ).rejects.toBeDefined();
    await expect(stubClient(offline).service.detail('b1')).rejects.toThrow('Network');
  });
});

type Case = {
  name: string;
  rpc: string;
  run: (service: StatusService) => Promise<unknown>;
  args: Record<string, unknown>;
  data: unknown;
  value: unknown;
  wrong: unknown;
};

const ETA = '2026-10-29T04:30:00.000Z';

const CASES: Case[] = [
  {
    name: 'start',
    rpc: 'start_bounty',
    run: (service) => service.start('b1', ETA),
    args: { bounty: 'b1', eta: ETA },
    data: { status: 'en_route', etaAt: ETA },
    value: { etaAt: ETA },
    wrong: { status: 'assigned', etaAt: ETA },
  },
  {
    name: 'updateEta',
    rpc: 'update_eta',
    run: (service) => service.updateEta('b1', ETA),
    args: { bounty: 'b1', eta: ETA },
    data: { status: 'en_route', etaAt: ETA, previousEtaAt: '2026-10-29T04:10:00Z' },
    value: { etaAt: ETA, previousEtaAt: '2026-10-29T04:10:00Z' },
    wrong: { status: 'en_route' },
  },
  {
    name: 'complete',
    rpc: 'complete_bounty',
    run: (service) => service.complete('b1'),
    args: { bounty: 'b1' },
    data: { status: 'done', autoConfirmAt: '2026-10-31T04:00:00Z' },
    value: { autoConfirmAt: '2026-10-31T04:00:00Z' },
    wrong: { status: 'done' },
  },
  {
    name: 'confirm',
    rpc: 'confirm_bounty',
    run: (service) => service.confirm('b1'),
    args: { bounty: 'b1' },
    data: { status: 'confirmed', paymentId: 'pay1' },
    value: { paymentId: 'pay1' },
    wrong: { status: 'confirmed', paymentId: null },
  },
  {
    name: 'reportProblem',
    rpc: 'report_bounty_problem',
    run: (service) => service.reportProblem('b1', '杯子碎了'),
    args: { bounty: 'b1', reason: '杯子碎了' },
    data: { status: 'disputed' },
    value: null,
    wrong: { status: 'done' },
  },
  {
    name: 'cancelPreview',
    rpc: 'bounty_cancel_preview',
    run: (service) => service.cancelPreview('b1'),
    args: { bounty: 'b1' },
    data: { offender: 'self', waiverAvailable: false, waiverBackAt: '2026-12-01T00:00:00Z' },
    value: { offender: 'self', waiverAvailable: false, waiverBackAt: '2026-12-01T00:00:00Z' },
    wrong: { offender: 'self', waiverAvailable: null },
  },
  {
    name: 'cancel',
    rpc: 'cancel_bounty',
    run: (service) => service.cancel('b1'),
    args: { bounty: 'b1' },
    data: { status: 'cancelled', offender: 'self', noShow: 'waived' },
    value: { offender: 'self', noShow: 'waived' },
    wrong: { status: 'cancelled', offender: 'self', noShow: 'forgiven' },
  },
  {
    name: 'close',
    rpc: 'close_bounty',
    run: (service) => service.close('b1'),
    args: { bounty: 'b1' },
    data: { status: 'closed', refund: 'free' },
    value: { refund: 'free' },
    wrong: { status: 'open', refund: 'free' },
  },
];

for (const { name, rpc, run, args, data, value, wrong } of CASES) {
  describe(name, () => {
    test('passes its arguments and answers the parsed value', async () => {
      const stub = stubClient(() => ok(data));
      expect(await run(stub.service)).toEqual({ ok: true, value });
      expect(stub.calls).toEqual([{ name: rpc, args }]);
    });

    test.each([
      ['invalid_transition', 'changed'],
      ['not_helper', 'unavailable'],
      ['not_poster', 'unavailable'],
      ['bounty_not_found', 'unavailable'],
      ['invalid_bounty', 'invalid'],
      ['invalid_reason', 'invalid'],
      ['something_new', 'failed'],
    ])('%s answers %s', async (message, reason) => {
      expect(await run(stubClient(() => rejected(message)).service)).toEqual({ ok: false, reason });
    });

    test('a network error or an unexpected answer is failed, never ok', async () => {
      expect(await run(stubClient(offline).service)).toEqual({ ok: false, reason: 'failed' });
      expect(await run(stubClient(() => ok(wrong)).service)).toEqual({
        ok: false,
        reason: 'failed',
      });
      expect(await run(stubClient(() => ok(null)).service)).toEqual({
        ok: false,
        reason: 'failed',
      });
    });

    test('without a client it fails instead of throwing', async () => {
      expect(await run(createSupabaseStatusService(null, () => 'CNY'))).toEqual({
        ok: false,
        reason: 'failed',
      });
    });
  });
}

describe('cancel preview shapes', () => {
  test.each<[Record<string, unknown>, CancelPreview]>([
    [{ offender: 'other', waiverAvailable: null, waiverBackAt: null }, { offender: 'other' }],
    [
      { offender: 'self', waiverAvailable: true, waiverBackAt: null },
      { offender: 'self', waiverAvailable: true },
    ],
    [
      { offender: 'self', waiverAvailable: false },
      { offender: 'self', waiverAvailable: false, waiverBackAt: null },
    ],
  ])('%p reads as %p', async (data, value) => {
    expect(await stubClient(() => ok(data)).service.cancelPreview('b1')).toEqual({
      ok: true,
      value,
    });
  });

  test('a close without a refund answers null', async () => {
    expect(
      await stubClient(() => ok({ status: 'closed', refund: null })).service.close('b1'),
    ).toEqual({ ok: true, value: { refund: null } });
  });
});
