import { describe, expect, test } from 'bun:test';

import {
  createFixtureStatusService,
  FIXTURE_PAYMENT_ID,
  fixtureStatusOptions,
  STATUS_SCENARIOS,
  type FixtureStatusOptions,
  type StatusCall,
} from './fixtureStatusService';
import type { StatusDetail } from './types';

const NOW = new Date('2026-10-29T04:00:00.000Z');
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();

const fixture = (patch: Partial<FixtureStatusOptions> = {}) =>
  createFixtureStatusService({
    ...fixtureStatusOptions(
      () => undefined,
      () => NOW,
    ),
    ...patch,
  });

async function read(service: ReturnType<typeof fixture>['service']): Promise<StatusDetail> {
  const detail = await service.detail('b1');
  if (detail === 'unavailable') throw new Error('unavailable');
  return detail;
}

test('launch arguments pick the scenario, role, load and waiver', () => {
  const args: Record<string, string> = {
    uiVerifyBountyStatus: 'disputed',
    uiVerifyBountyRole: 'helper',
    uiVerifyBountyStatusLoad: 'refreshFails',
    uiVerifyBountyWaiver: 'used',
  };
  expect(fixtureStatusOptions((name) => args[name])).toMatchObject({
    scenario: 'disputed',
    role: 'helper',
    load: 'refreshFails',
    waiver: 'used',
  });
  expect(fixtureStatusOptions(() => 'nonsense')).toMatchObject({
    scenario: 'assigned',
    role: 'poster',
    load: 'ok',
    waiver: 'available',
  });
});

test('a failFirst launch argument fails the first call of that RPC only, then it goes through', async () => {
  const { service } = fixture({
    ...fixtureStatusOptions(
      (name) => (name === 'uiVerifyBountyStatusFail' ? 'complete_bounty' : undefined),
      () => NOW,
    ),
    scenario: 'enRoute',
    role: 'helper',
  });
  expect(await service.complete('b1')).toEqual({ ok: false, reason: 'failed' });
  expect((await read(service)).status).toBe('en_route');
  const again = await service.complete('b1');
  expect(again.ok).toBe(true);
  expect((await read(service)).status).toBe('done');
});

describe('scenarios', () => {
  test.each(STATUS_SCENARIOS.filter((scenario) => scenario !== 'open'))(
    '%s reads for both roles with the same status',
    async (scenario) => {
      const poster = await read(fixture({ scenario, role: 'poster' }).service);
      const helper = await read(fixture({ scenario, role: 'helper' }).service);
      expect(poster.viewerRole).toBe('poster');
      expect(helper.viewerRole).toBe('helper');
      expect(helper.status).toBe(poster.status);
      expect(poster.helper?.name).toBe('阿杰');
    },
  );

  test('every scenario carries the fields its state needs', async () => {
    const statuses: Record<string, string> = {};
    for (const scenario of STATUS_SCENARIOS) {
      const detail = await read(fixture({ scenario }).service);
      statuses[scenario] = detail.status;
      expect(detail.startLate).toBe(scenario === 'assignedLate');
      expect(detail.autoConfirmAt !== null).toBe(scenario === 'done');
      expect(detail.issueReason !== null).toBe(scenario === 'disputed');
      expect(detail.previousEtaAt !== null).toBe(scenario === 'enRouteChanged');
      expect(detail.charge).toBe(scenario === 'open' ? 'free' : null);
    }
    expect(statuses).toEqual({
      open: 'open',
      assigned: 'assigned',
      assignedLate: 'assigned',
      enRoute: 'en_route',
      enRouteChanged: 'en_route',
      done: 'done',
      disputed: 'disputed',
      confirmed: 'confirmed',
      markedPaid: 'confirmed',
      settled: 'settled',
      cancelled: 'cancelled',
    });
  });

  test('payments follow the scenario', async () => {
    expect((await read(fixture({ scenario: 'confirmed' }).service)).payment).toEqual({
      id: FIXTURE_PAYMENT_ID,
      state: 'due',
      amount: { minor: 800, currency: 'MYR' },
      converted: null,
    });
    expect(
      (await read(fixture({ scenario: 'confirmed', data: 'cny' }).service)).payment,
    ).toMatchObject({
      amount: { minor: 5000, currency: 'CNY' },
      converted: { minor: 3061, currency: 'MYR' },
    });
    expect((await read(fixture({ scenario: 'markedPaid' }).service)).payment?.state).toBe(
      'marked_paid',
    );
    expect((await read(fixture({ scenario: 'settled' }).service)).payment?.state).toBe('settled');
    expect((await read(fixture({ scenario: 'done' }).service)).payment).toBeNull();
  });

  test('a helper cannot read an open bounty', async () => {
    expect(await fixture({ scenario: 'open', role: 'helper' }).service.detail('b1')).toBe(
      'unavailable',
    );
  });
});

describe('loads', () => {
  test('firstFails throws once; refreshFails throws on the second read only', async () => {
    const first = fixture({ load: 'firstFails' }).service;
    await expect(first.detail('b1')).rejects.toThrow('Network');
    expect((await read(first)).status).toBe('assigned');
    const refresh = fixture({ load: 'refreshFails' }).service;
    await read(refresh);
    await expect(refresh.detail('b1')).rejects.toThrow('Network');
    expect((await read(refresh)).status).toBe('assigned');
  });

  test('unavailable never loads', async () => {
    expect(await fixture({ load: 'unavailable' }).service.detail('b1')).toBe('unavailable');
  });
});

describe('helper transitions', () => {
  test('start, change the ETA twice, complete; a repeat start answers the current ETA', async () => {
    const { service } = fixture({ role: 'helper' });
    expect(await service.start('b1', later(30))).toEqual({ ok: true, value: { etaAt: later(30) } });
    expect(await service.start('b1', later(45))).toEqual({ ok: true, value: { etaAt: later(30) } });
    expect(await service.updateEta('b1', later(40))).toEqual({
      ok: true,
      value: { etaAt: later(40), previousEtaAt: later(30) },
    });
    const enRoute = await read(service);
    expect([enRoute.status, enRoute.etaAt, enRoute.previousEtaAt]).toEqual([
      'en_route',
      later(40),
      later(30),
    ]);
    expect(enRoute.events.map((event) => event.kind).slice(-2)).toEqual(['started', 'eta_changed']);
    expect(await service.complete('b1')).toEqual({
      ok: true,
      value: { autoConfirmAt: later(48 * 60) },
    });
    expect((await read(service)).status).toBe('done');
    expect(await service.updateEta('b1', later(50))).toEqual({ ok: false, reason: 'changed' });
  });

  test('an ETA in the past or equal to the current one is invalid', async () => {
    const { service } = fixture({ role: 'helper' });
    expect(await service.start('b1', later(0))).toEqual({ ok: false, reason: 'invalid' });
    await service.start('b1', later(30));
    expect(await service.updateEta('b1', later(30))).toEqual({ ok: false, reason: 'invalid' });
    expect(await service.updateEta('b1', later(-1))).toEqual({ ok: false, reason: 'invalid' });
  });

  test('completing again after a problem clears the reason and restarts 48 h', async () => {
    const { service } = fixture({ scenario: 'disputed', role: 'helper' });
    expect(await service.complete('b1')).toMatchObject({ ok: true });
    const detail = await read(service);
    expect([detail.status, detail.issueReason, detail.autoConfirmAt]).toEqual([
      'done',
      null,
      later(48 * 60),
    ]);
  });

  test('a poster calling helper actions is unavailable', async () => {
    const { service } = fixture({ scenario: 'enRoute' });
    expect(await service.start('b1', later(30))).toEqual({ ok: false, reason: 'unavailable' });
    expect(await service.complete('b1')).toEqual({ ok: false, reason: 'unavailable' });
    expect((await read(service)).status).toBe('en_route');
  });
});

describe('poster transitions', () => {
  test('report a problem, then confirm opens the payment; a repeat confirm answers it again', async () => {
    const { service } = fixture({ scenario: 'done' });
    expect(await service.reportProblem('b1', '  杯子碎了  ')).toEqual({ ok: true, value: null });
    const disputed = await read(service);
    expect([disputed.status, disputed.issueReason]).toEqual(['disputed', '杯子碎了']);
    expect(await service.confirm('b1')).toEqual({
      ok: true,
      value: { paymentId: FIXTURE_PAYMENT_ID },
    });
    expect(await service.confirm('b1')).toEqual({
      ok: true,
      value: { paymentId: FIXTURE_PAYMENT_ID },
    });
    expect((await read(service)).payment).toMatchObject({ id: FIXTURE_PAYMENT_ID, state: 'due' });
  });

  test('a blank or 141-character reason is invalid', async () => {
    const { service } = fixture({ scenario: 'done' });
    expect(await service.reportProblem('b1', '   ')).toEqual({ ok: false, reason: 'invalid' });
    expect(await service.reportProblem('b1', '碎'.repeat(141))).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await service.reportProblem('b1', '碎'.repeat(140))).toEqual({ ok: true, value: null });
  });

  test('confirm before 完成 has changed', async () => {
    expect(await fixture({ scenario: 'enRoute' }).service.confirm('b1')).toEqual({
      ok: false,
      reason: 'changed',
    });
  });

  test('close refunds the charge once and answers the same for a repeat', async () => {
    const { service } = fixture({ scenario: 'open' });
    expect(await service.close('b1')).toEqual({ ok: true, value: { refund: 'free' } });
    expect(await service.close('b1')).toEqual({ ok: true, value: { refund: 'free' } });
    expect((await read(service)).status).toBe('closed');
    expect(await fixture({ scenario: 'assigned' }).service.close('b1')).toEqual({
      ok: false,
      reason: 'changed',
    });
  });
});

describe('cancel', () => {
  test('a poster cancelling after a late start puts it on the helper', async () => {
    const { service } = fixture({ scenario: 'assignedLate' });
    expect(await service.cancelPreview('b1')).toEqual({ ok: true, value: { offender: 'other' } });
    expect(await service.cancel('b1')).toEqual({
      ok: true,
      value: { offender: 'other', noShow: null },
    });
    expect((await read(service)).status).toBe('cancelled');
  });

  test('a helper withdrawing uses the waiver while it is left', async () => {
    const { service } = fixture({ scenario: 'enRoute', role: 'helper' });
    expect(await service.cancelPreview('b1')).toEqual({
      ok: true,
      value: { offender: 'self', waiverAvailable: true },
    });
    expect(await service.cancel('b1')).toEqual({
      ok: true,
      value: { offender: 'self', noShow: 'waived' },
    });
    expect(await service.cancel('b1')).toEqual({
      ok: true,
      value: { offender: 'self', noShow: 'waived' },
    });
  });

  test('with the waiver used, the preview names the day it comes back and the cancel counts', async () => {
    const { service } = fixture({ waiver: 'used' });
    expect(await service.cancelPreview('b1')).toEqual({
      ok: true,
      value: { offender: 'self', waiverAvailable: false, waiverBackAt: later(20 * 24 * 60) },
    });
    expect(await service.cancel('b1')).toEqual({
      ok: true,
      value: { offender: 'self', noShow: 'counted' },
    });
  });

  test('after 完成 the preview and the cancel have changed', async () => {
    const { service } = fixture({ scenario: 'done' });
    expect(await service.cancelPreview('b1')).toEqual({ ok: false, reason: 'changed' });
    expect(await service.cancel('b1')).toEqual({ ok: false, reason: 'changed' });
  });
});

describe('failNext', () => {
  test('fails exactly the next action and leaves the bounty unchanged', async () => {
    const { service, failNext } = fixture({ role: 'helper' });
    failNext();
    expect(await service.start('b1', later(30))).toEqual({ ok: false, reason: 'failed' });
    expect((await read(service)).status).toBe('assigned');
    expect(await service.start('b1', later(30))).toMatchObject({ ok: true });
  });

  test('can answer changed or unavailable', async () => {
    const { service, failNext } = fixture({ scenario: 'done' });
    failNext('changed');
    expect(await service.confirm('b1')).toEqual({ ok: false, reason: 'changed' });
    failNext('unavailable');
    expect(await service.detail('b1')).toBe('unavailable');
    expect((await read(service)).status).toBe('done');
  });

  test('a failed read throws a network error once', async () => {
    const { service, failNext } = fixture();
    failNext();
    await expect(service.detail('b1')).rejects.toThrow('Network');
    expect((await read(service)).status).toBe('assigned');
  });
});

test('every call is recorded with its arguments, failed ones included', async () => {
  let recorded: StatusCall[] = [];
  const { service, failNext, calls } = fixture({
    role: 'helper',
    onCalled: (next) => (recorded = next),
  });
  failNext();
  await service.start('b1', later(30));
  await service.start('b1', later(30));
  expect(recorded).toEqual([
    { name: 'start_bounty', bountyId: 'b1', args: { eta: later(30) } },
    { name: 'start_bounty', bountyId: 'b1', args: { eta: later(30) } },
  ]);
  expect(calls()).toEqual(recorded);
});

test('actions wait for the write delay', async () => {
  const { service } = fixture({ role: 'helper', writeDelayMs: 30 });
  const started = Date.now();
  await service.start('b1', later(30));
  expect(Date.now() - started).toBeGreaterThanOrEqual(25);
});
