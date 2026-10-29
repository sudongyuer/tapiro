import { describe, expect, test } from 'bun:test';

import {
  createFixtureStatusService,
  FIXTURE_REASON,
  type StatusScenario,
} from './fixtureStatusService';
import {
  actionKey,
  statusActions,
  statusSummary,
  timeline,
  type StatusActions,
  type StepState,
} from './timeline';
import type { StatusDetail, StatusRole } from './types';

const NOW = new Date('2026-10-29T04:00:00.000Z');
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();

async function detailOf(scenario: StatusScenario, role: StatusRole): Promise<StatusDetail> {
  const { service } = createFixtureStatusService({
    scenario,
    role,
    load: 'ok',
    waiver: 'available',
    now: () => NOW,
  });
  const detail = await service.detail('b1');
  if (detail === 'unavailable') throw new Error('unavailable');
  return detail;
}

const D: StepState = 'done';
const C: StepState = 'current';
const N: StepState = 'needsYou';
const U: StepState = 'upcoming';

const STATES: [StatusScenario, StatusRole, StepState[]][] = [
  ['open', 'poster', [N, U, U, U, U]],
  ['assigned', 'poster', [D, C, U, U, U]],
  ['assigned', 'helper', [D, N, U, U, U]],
  ['assignedLate', 'poster', [D, C, U, U, U]],
  ['assignedLate', 'helper', [D, N, U, U, U]],
  ['enRoute', 'poster', [D, D, C, U, U]],
  ['enRoute', 'helper', [D, D, N, U, U]],
  ['enRouteChanged', 'poster', [D, D, C, U, U]],
  ['enRouteChanged', 'helper', [D, D, N, U, U]],
  ['done', 'poster', [D, D, D, N, U]],
  ['done', 'helper', [D, D, D, C, U]],
  ['disputed', 'poster', [D, D, C, U, U]],
  ['disputed', 'helper', [D, D, N, U, U]],
  ['confirmed', 'poster', [D, D, D, D, N]],
  ['confirmed', 'helper', [D, D, D, D, C]],
  ['markedPaid', 'poster', [D, D, D, D, C]],
  ['markedPaid', 'helper', [D, D, D, D, N]],
  ['settled', 'poster', [D, D, D, D, D]],
  ['settled', 'helper', [D, D, D, D, D]],
  ['cancelled', 'poster', [D, U, U, U, U]],
  ['cancelled', 'helper', [D, U, U, U, U]],
];

describe('timeline', () => {
  test.each(STATES)('%s as %s', async (scenario, role, states) => {
    const steps = timeline(await detailOf(scenario, role), role).steps;
    expect(steps.map((step) => step.id)).toEqual([
      'selected',
      'started',
      'completed',
      'confirmed',
      'payment',
    ]);
    expect(steps.map((step) => step.state)).toEqual(states);
  });

  test('step keys follow the role and switch to the past tense once done', async () => {
    const poster = timeline(await detailOf('assigned', 'poster'), 'poster').steps;
    expect(poster.map((step) => step.key)).toEqual([
      'bounty.status.step.poster.selected',
      'bounty.status.step.poster.started',
      'bounty.status.step.poster.completed',
      'bounty.status.step.poster.confirm',
      'bounty.status.step.poster.paid',
    ]);
    const helper = timeline(await detailOf('assigned', 'helper'), 'helper').steps;
    expect(helper.map((step) => step.key)).toEqual([
      'bounty.status.step.helper.selected',
      'bounty.status.step.helper.start',
      'bounty.status.step.helper.complete',
      'bounty.status.step.helper.confirmed',
      'bounty.status.step.helper.paid',
    ]);
    const settledHelper = timeline(await detailOf('settled', 'helper'), 'helper').steps;
    expect(settledHelper.map((step) => step.key).slice(1, 3)).toEqual([
      'bounty.status.step.helper.started',
      'bounty.status.step.helper.completed',
    ]);
    const settledPoster = timeline(await detailOf('settled', 'poster'), 'poster').steps;
    expect(settledPoster[3].key).toBe('bounty.status.step.poster.confirmed');
    expect(poster[0].params).toEqual({ name: '阿杰', amount: { minor: 800, currency: 'MYR' } });
    expect(helper[0].params).toEqual({ name: '小林', amount: { minor: 800, currency: 'MYR' } });
  });

  test('done steps carry their event time; current and upcoming steps have none', async () => {
    const steps = timeline(await detailOf('confirmed', 'poster'), 'poster').steps;
    expect(steps.map((step) => step.at)).toEqual([at(-60), at(-40), at(-30), at(-10), null]);
    const assigned = timeline(await detailOf('assigned', 'helper'), 'helper').steps;
    expect(assigned.map((step) => step.at)).toEqual([at(-60), null, null, null, null]);
  });

  test('assigned shows the agreed start; a late start warns instead, for both roles', async () => {
    const onTime = (role: StatusRole) => detailOf('assigned', role);
    expect(timeline(await onTime('helper'), 'helper').steps[1].lines).toEqual([
      {
        kind: 'departBy',
        key: 'bounty.status.note.departBy',
        params: { at: at(30) },
        struck: false,
        tone: 'plain',
      },
    ]);
    expect(
      timeline(await onTime('poster'), 'poster').steps[1].lines.map((line) => line.key),
    ).toEqual(['bounty.status.note.departByPoster']);
    for (const role of ['poster', 'helper'] as const) {
      expect(timeline(await detailOf('assignedLate', role), role).steps[1].lines).toEqual([
        {
          kind: 'late',
          key: 'bounty.status.note.late',
          params: { at: at(-40) },
          struck: false,
          tone: 'warning',
        },
      ]);
    }
    const noStart = { ...(await onTime('helper')), startsAt: null };
    expect(timeline(noStart, 'helper').steps[1].lines).toEqual([]);
  });

  test('en route shows the ETA; a changed ETA adds the old time struck through', async () => {
    const first = timeline(await detailOf('enRoute', 'poster'), 'poster').steps[1].lines;
    expect(first.map((line) => [line.key, line.params.at, line.struck])).toEqual([
      ['bounty.status.note.eta', at(10), false],
    ]);
    const changed = timeline(await detailOf('enRouteChanged', 'helper'), 'helper').steps[1].lines;
    expect(changed.map((line) => [line.kind, line.key, line.params.at, line.struck])).toEqual([
      ['eta', 'bounty.status.note.eta', at(25), false],
      ['etaPrevious', 'bounty.eta.previous', at(10), true],
    ]);
    const later = timeline(await detailOf('done', 'helper'), 'helper').steps[1].lines;
    expect(later).toEqual([]);
  });

  test('disputed shows the reason under 点完成 as a warning, worded per role', async () => {
    const helper = timeline(await detailOf('disputed', 'helper'), 'helper').steps;
    expect(helper[2].lines).toEqual([
      {
        kind: 'reason',
        key: 'bounty.status.note.reason',
        params: { reason: FIXTURE_REASON, at: at(-10) },
        struck: false,
        tone: 'warning',
      },
      {
        kind: 'dispute',
        key: 'bounty.status.note.disputeHelper',
        params: {},
        struck: false,
        tone: 'plain',
      },
    ]);
    const poster = timeline(await detailOf('disputed', 'poster'), 'poster').steps;
    expect(poster[2].lines.map((line) => [line.key, line.params, line.tone])).toEqual([
      ['bounty.status.note.yourReason', { reason: FIXTURE_REASON, at: at(-10) }, 'warning'],
      ['bounty.status.note.disputePoster', { name: '阿杰' }, 'plain'],
    ]);
    expect(poster[3].lines).toEqual([]);
  });

  test('done shows the auto-confirm time on the confirm step, worded per role', async () => {
    const autoAt = new Date(NOW.getTime() + 47 * 3_600_000 + 50 * 60_000).toISOString();
    const poster = timeline(await detailOf('done', 'poster'), 'poster').steps[3];
    expect(poster.lines.map((line) => [line.key, line.params])).toEqual([
      ['bounty.status.note.autoConfirmPoster', { at: autoAt }],
    ]);
    const helper = timeline(await detailOf('done', 'helper'), 'helper').steps[3];
    expect(helper.lines.map((line) => [line.key, line.params])).toEqual([
      ['bounty.status.note.autoConfirmHelper', { at: autoAt, name: '小林' }],
    ]);
  });

  test('an automatic confirmation still times the confirm step', async () => {
    const detail = await detailOf('confirmed', 'helper');
    const auto: StatusDetail = {
      ...detail,
      events: detail.events.map((event) =>
        event.kind === 'confirmed' ? { ...event, kind: 'auto_confirmed', actor: null } : event,
      ),
    };
    expect(timeline(auto, 'helper').steps[3]).toMatchObject({ state: 'done', at: at(-10) });
  });

  test('confirmed explains the payment on the last step until it settles', async () => {
    const helper = timeline(await detailOf('markedPaid', 'helper'), 'helper').steps[4];
    expect(helper.lines.map((line) => [line.key, line.params])).toEqual([
      ['bounty.status.note.payHelper', { name: '小林' }],
    ]);
    const poster = timeline(await detailOf('confirmed', 'poster'), 'poster').steps[4];
    expect(poster.lines.map((line) => [line.key, line.params])).toEqual([
      ['bounty.status.note.payPoster', { name: '阿杰' }],
    ]);
    expect(timeline(await detailOf('settled', 'poster'), 'poster').steps[4].lines).toEqual([]);
  });

  test('only cancelled and closed bounties end, naming who ended them', async () => {
    expect(timeline(await detailOf('cancelled', 'poster'), 'poster').ended).toEqual({
      kind: 'cancelled',
      at: at(-5),
      by: 'you',
    });
    expect(timeline(await detailOf('cancelled', 'helper'), 'helper').ended).toEqual({
      kind: 'cancelled',
      at: at(-5),
      by: 'them',
    });
    expect(timeline(await detailOf('settled', 'poster'), 'poster').ended).toBeNull();
    const closed: StatusDetail = {
      ...(await detailOf('open', 'poster')),
      status: 'closed',
      events: [],
    };
    expect(timeline(closed, 'poster').ended).toEqual({ kind: 'closed', at: null, by: null });
    expect(timeline(closed, 'poster').steps.every((step) => step.state === 'upcoming')).toBe(true);
  });

  test('a bounty cancelled en route keeps 出发了 done', async () => {
    const detail = await detailOf('enRoute', 'helper');
    const cancelled: StatusDetail = { ...detail, status: 'cancelled' };
    expect(timeline(cancelled, 'helper').steps.map((step) => step.state)).toEqual([D, D, U, U, U]);
  });
});

const ACTIONS: [StatusScenario, StatusRole, StatusActions][] = [
  ['open', 'poster', { pinned: [], menu: [] }],
  ['assigned', 'poster', { pinned: [], menu: ['cancel'] }],
  ['assigned', 'helper', { pinned: ['start'], menu: ['cancel'] }],
  ['assignedLate', 'poster', { pinned: [], menu: ['cancel'] }],
  ['assignedLate', 'helper', { pinned: ['start'], menu: ['cancel'] }],
  ['enRoute', 'poster', { pinned: [], menu: ['cancel'] }],
  ['enRoute', 'helper', { pinned: ['complete', 'changeEta'], menu: ['cancel'] }],
  ['enRouteChanged', 'helper', { pinned: ['complete', 'changeEta'], menu: ['cancel'] }],
  ['done', 'poster', { pinned: ['confirm', 'reportIssue'], menu: [] }],
  ['done', 'helper', { pinned: [], menu: [] }],
  ['disputed', 'poster', { pinned: ['confirm'], menu: [] }],
  ['disputed', 'helper', { pinned: ['completeAgain'], menu: [] }],
  ['confirmed', 'poster', { pinned: ['pay'], menu: [] }],
  ['confirmed', 'helper', { pinned: [], menu: [] }],
  ['markedPaid', 'poster', { pinned: ['pay'], menu: [] }],
  ['markedPaid', 'helper', { pinned: ['pay'], menu: [] }],
  ['settled', 'poster', { pinned: [], menu: [] }],
  ['settled', 'helper', { pinned: [], menu: [] }],
  ['cancelled', 'poster', { pinned: [], menu: [] }],
  ['cancelled', 'helper', { pinned: [], menu: [] }],
];

describe('statusActions', () => {
  test.each(ACTIONS)('%s as %s', async (scenario, role, actions) => {
    expect(statusActions(await detailOf(scenario, role), role)).toEqual(actions);
  });

  test('a confirmed bounty whose payment has not opened offers no pay button', async () => {
    const detail = { ...(await detailOf('confirmed', 'poster')), payment: null };
    expect(statusActions(detail, 'poster')).toEqual({ pinned: [], menu: [] });
  });

  test('a disputed payment lets both sides open the pay sheet', async () => {
    const detail = await detailOf('confirmed', 'helper');
    const disputed = { ...detail, payment: { ...detail.payment!, state: 'disputed' as const } };
    expect(statusActions(disputed, 'helper').pinned).toEqual(['pay']);
    expect(statusActions(disputed, 'poster').pinned).toEqual(['pay']);
  });
});

describe('copy keys', () => {
  test('actions name their copy; the helper withdraws instead of cancelling', () => {
    expect(actionKey('reportIssue', 'poster')).toBe('bounty.status.action.problem');
    expect(actionKey('cancel', 'poster')).toBe('bounty.status.action.cancel');
    expect(actionKey('cancel', 'helper')).toBe('bounty.status.action.withdraw');
    expect(actionKey('completeAgain', 'helper')).toBe('bounty.status.action.completeAgain');
  });

  test.each([
    ['assigned', 'poster', 'bounty.status.summary.poster.assigned'],
    ['assignedLate', 'helper', 'bounty.status.summary.helper.late'],
    ['enRoute', 'helper', 'bounty.status.summary.helper.enRoute'],
    ['done', 'poster', 'bounty.status.summary.poster.done'],
    ['disputed', 'helper', 'bounty.status.summary.helper.disputed'],
    ['markedPaid', 'poster', 'bounty.status.summary.poster.confirmed'],
    ['settled', 'helper', 'bounty.status.summary.helper.settled'],
    ['cancelled', 'poster', 'bounty.status.summary.poster.cancelled'],
  ] as const)('%s as %s summarises as %s', async (scenario, role, key) => {
    expect(statusSummary(await detailOf(scenario, role), role)).toEqual({
      key,
      params: { name: role === 'poster' ? '阿杰' : '小林' },
    });
  });

  test('an open bounty has no status summary', async () => {
    expect(statusSummary(await detailOf('open', 'poster'), 'poster')).toBeNull();
  });
});
