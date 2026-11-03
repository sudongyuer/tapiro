import { describe, expect, test } from 'bun:test';

import {
  appealsToConfirm,
  appealView,
  arrival,
  askGoOrCancel,
  countdown,
  departPreticked,
  detailPhase,
  footer,
  menuItems,
  shouldPoll,
  timeline,
} from './detailModel';
import { FIXTURE_VIEWER, fixtureRideDetail } from './fixtureDetails';
import { settleScene, type SettleScene } from './fixtureSettle';
import { myRider, owedDays, paidCount } from './settleModel';
import type { RideDetail } from './types';

const NOW = Date.parse('2026-11-02T14:07:00Z');
const MINUTE = 60_000;

const scene = (name: Parameters<typeof fixtureRideDetail>[0]) => fixtureRideDetail(name, NOW);

describe('ride detail phase and timeline (187 A)', () => {
  test('before 集合 the current step is 凑齐 and later steps are future', () => {
    const steps = timeline(scene('viewer'), NOW);
    expect(steps.map((step) => step.state)).toEqual([
      'past',
      'now',
      'future',
      'future',
      'future',
      'future',
    ]);
  });

  test('at T-30 the ride is at 集合 even before the job flips the status', () => {
    const ride = { ...scene('meetup'), status: 'open' } as RideDetail;
    expect(detailPhase(ride, NOW)).toBe('meetup');
    expect(timeline(ride, NOW).find((step) => step.state === 'now')?.key).toBe('meetup');
  });

  test('到了 shows the typed 预计到 as an estimate', () => {
    const arrive = timeline(scene('organiser'), NOW).find((step) => step.key === 'arrive');
    expect(arrive?.estimate).toBe(true);
    expect(arrive?.at).not.toBeNull();
  });

  test('an open ride two hours past departure reads as expired', () => {
    const ride = { ...scene('viewer'), departAt: new Date(NOW - 121 * MINUTE).toISOString() };
    expect(detailPhase(ride, NOW)).toBe('expired');
  });
});

describe('countdown (193 A)', () => {
  test('counts down to departure, then up after it', () => {
    expect(countdown(scene('meetup'), NOW)).toEqual({ late: false, minutes: 10 });
    expect(countdown(scene('depart'), NOW)).toEqual({ late: true, minutes: 6 });
  });
});

describe('arrivals (194 A, 196 A)', () => {
  test('arrived, late and waiting members', () => {
    const [, ming, ya, jie] = scene('meetupLate').members ?? [];
    expect(arrival(ming, NOW).kind).toBe('arrived');
    expect(arrival(ya, NOW).kind).toBe('arrived');
    const late = arrival(jie, NOW);
    expect(late.kind === 'late' && late.minutes).toBe(5);
    const waiting = scene('meetup').members?.find((m) => m.id === FIXTURE_VIEWER);
    expect(waiting && arrival(waiting, NOW).kind).toBe('waiting');
  });

  test('the boarding sheet pre-ticks everyone who tapped 我到了, never the organiser', () => {
    expect(departPreticked(scene('depart')).sort()).toEqual(
      ['fixture-ride-aming', 'fixture-ride-xiaoya'].sort(),
    );
  });
});

describe('footer by role', () => {
  test('a non-member applies, an applicant waits, a full ride says so', () => {
    expect(footer(scene('viewer'), NOW)).toEqual({ kind: 'apply', blocked: null });
    expect(footer({ ...scene('viewer'), taken: 3 }, NOW)).toEqual({
      kind: 'apply',
      blocked: 'full',
    });
    expect(footer(scene('applicant'), NOW).kind).toBe('applied');
  });

  test('members get 我到了 only from 集合, then the undo line', () => {
    expect(footer(scene('member'), NOW).kind).toBe('none');
    expect(footer(scene('meetup'), NOW).kind).toBe('arrive');
    expect(footer(scene('meetupArrived'), NOW).kind).toBe('arrived');
  });

  test('the organiser gets 出发 at 集合 and nothing before', () => {
    expect(footer(scene('organiser'), NOW).kind).toBe('none');
    expect(footer(scene('meetupLate'), NOW)).toEqual({
      kind: 'depart',
      arrived: 2,
      selfArrived: true,
    });
  });

  test('after 出发 a rider waits for the split and an outsider sees nothing', () => {
    expect(footer(scene('confirmAppeal'), NOW, FIXTURE_VIEWER)).toEqual({
      kind: 'settle',
      settle: { kind: 'waitSplit' },
    });
    expect(footer(scene('appealOpen'), NOW, FIXTURE_VIEWER).kind).toBe('none');
  });
});

describe('到了 and 结清 footers (210 A, 213 A)', () => {
  const settle = (name: SettleScene) => settleScene(name, NOW);
  const kind = (ride: RideDetail) => {
    const answer = footer(ride, NOW, FIXTURE_VIEWER);
    return answer.kind === 'settle' ? answer.settle : answer;
  };

  test('only the organiser presses 到了; a Grab-split ride says so', () => {
    expect(kind(settle('reach'))).toEqual({ kind: 'reach', grab: false });
    expect(kind(settle('reachGrab'))).toEqual({ kind: 'reach', grab: true });
    expect(kind(settle('reachRider'))).toEqual({ kind: 'waitSplit' });
  });

  test('a rider pays their own share; the organiser has no bottom button while settling', () => {
    expect(kind(settle('paying'))).toEqual({
      kind: 'pay',
      share: { minor: 2470, currency: 'MYR' },
      paymentId: 'fixture-ride-owe',
      disputed: false,
    });
    expect(kind(settle('paidSome'))).toEqual({ kind: 'none' });
    expect(kind(settle('settled'))).toEqual({ kind: 'none' });
  });

  test('a rider who said paid waits; one already settled waits for the others', () => {
    const paying = settle('paying');
    const mark = (paid: 'paid' | 'settled') => ({
      ...paying,
      settle: paying.settle && {
        ...paying.settle,
        riders: paying.settle.riders.map((r) => (r.id === FIXTURE_VIEWER ? { ...r, paid } : r)),
      },
    });
    expect(kind(mark('paid'))).toEqual({ kind: 'paid', paymentId: 'fixture-ride-owe' });
    expect(kind(mark('settled'))).toEqual({ kind: 'mineSettled' });
  });
});

describe('owed days (216 A)', () => {
  test('the day count starts a full day after the split', () => {
    expect(owedDays(myRider(settleScene('paying', NOW), FIXTURE_VIEWER), NOW)).toBe(0);
    expect(owedDays(myRider(settleScene('owing', NOW), FIXTURE_VIEWER), NOW)).toBe(1);
    expect(paidCount(settleScene('paidSome', NOW))).toEqual({
      paid: 1,
      received: 0,
      waiting: 1,
      total: 2,
    });
  });
});

describe('appeals (233 A)', () => {
  test('an unticked member can appeal inside the window', () => {
    expect(appealView(scene('appealOpen'), NOW).kind).toBe('canAppeal');
    expect(appealView(scene('appealPending'), NOW).kind).toBe('pending');
    expect(appealView(scene('appealLapsed'), NOW)).toEqual({ kind: 'lapsed', outcome: 'counted' });
  });

  test('after 72 h without an appeal the window is closed', () => {
    const ride = { ...scene('appealOpen'), appealEndsAt: new Date(NOW - MINUTE).toISOString() };
    expect(appealView(ride, NOW).kind).toBe('closed');
  });

  test('only boarded members confirm, and only inside the window', () => {
    const ride = scene('confirmAppeal');
    expect(appealsToConfirm(ride, FIXTURE_VIEWER, NOW).map((m) => m.id)).toEqual([
      'fixture-ride-ajie',
    ]);
    expect(appealsToConfirm(ride, 'fixture-ride-ajie', NOW)).toEqual([]);
    expect(appealsToConfirm(ride, FIXTURE_VIEWER, NOW + 73 * 60 * MINUTE)).toEqual([]);
  });
});

describe('menu and prompts', () => {
  test('the organiser moves the time, edits details and cancels; others block, members leave', () => {
    expect(menuItems(scene('organiser'), NOW)).toEqual(['reviseTime', 'editDetails', 'cancel']);
    expect(menuItems(scene('member'), NOW)).toEqual(['leave', 'block']);
    expect(menuItems(scene('viewer'), NOW)).toEqual(['block']);
  });

  test('照常走还是取消 only for an organiser short of people inside T-15', () => {
    expect(askGoOrCancel(scene('goOrCancel'), NOW + 6 * MINUTE)).toBe(true);
    expect(askGoOrCancel(scene('goOrCancel'), NOW - 6 * MINUTE)).toBe(false);
    expect(askGoOrCancel(scene('meetupLate'), NOW)).toBe(false);
  });
});

describe('polling (175 B)', () => {
  test('polls at 集合 within 15 minutes of departure only', () => {
    expect(shouldPoll(scene('meetup'), NOW)).toBe(true);
    expect(shouldPoll(scene('meetup'), NOW - 10 * MINUTE)).toBe(false);
    expect(shouldPoll(scene('viewer'), NOW)).toBe(false);
    expect(shouldPoll(null, NOW)).toBe(false);
  });
});
