import { describe, expect, test } from 'bun:test';

import type { LiveActivitySubject } from './content';
import { keptStarted, planLiveActivities, topSubject } from './plan';

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 12, 5, 8);

const onTheWay = (id: string, etaIn: number): LiveActivitySubject => ({
  kind: 'bounty',
  id,
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: NOW - 6 * MINUTE,
  etaAt: NOW + etaIn * MINUTE,
});

const arrived = (id: string, minutesAgo: number): LiveActivitySubject => ({
  kind: 'bounty',
  id,
  phase: 'arrived',
  helper: '小林',
  place: '图书馆',
  leftAt: NOW - 20 * MINUTE,
  arrivedAt: NOW - minutesAgo * MINUTE,
});

const meetup = (id: string, departIn: number): LiveActivitySubject => ({
  kind: 'ride',
  id,
  phase: 'meetup',
  start: { name: '双威', home: false },
  gatherAt: NOW + (departIn - 30) * MINUTE,
  departAt: NOW + departIn * MINUTE,
  arrived: 1,
  total: 3,
});

const departed = (id: string, minutesAgo: number): LiveActivitySubject => ({
  kind: 'ride',
  id,
  phase: 'departed',
  start: { name: '双威', home: false },
  gatherAt: NOW - 40 * MINUTE,
  departedAt: NOW - minutesAgo * MINUTE,
  aboard: 3,
});

const B1 = 'tapiro://bounty/status/b1';
const B2 = 'tapiro://bounty/status/b2';
const R1 = 'tapiro://ride/r1';

const plan = (
  running: { id: string; link: string | null }[],
  subjects: LiveActivitySubject[],
  started: string[] = running.flatMap((activity) => activity.link ?? []),
  unreadable: string[] = [],
) =>
  planLiveActivities({
    running,
    subjects,
    started: new Set(started),
    unreadable: new Set(unreadable),
    now: NOW,
  });

describe('starting (275 A)', () => {
  test('a bounty that enters en_route starts an activity', () => {
    expect(plan([], [onTheWay('b1', 6)])).toEqual([
      { type: 'start', link: B1, subject: onTheWay('b1', 6) },
    ]);
  });

  test('a ride at 集合 starts an activity', () => {
    expect(plan([], [meetup('r1', 20)])).toEqual([
      { type: 'start', link: R1, subject: meetup('r1', 20) },
    ]);
  });

  test('a final step never starts one: an arrival seen first after the fact stays off the Lock Screen', () => {
    expect(plan([], [arrived('b1', 1), departed('r1', 2)])).toEqual([]);
  });

  test('one started before and no longer running (dismissed by the user, or ended by iOS) is not started again', () => {
    expect(plan([], [onTheWay('b1', 6)], [B1])).toEqual([]);
  });

  test('a dismissed item does not block the next one', () => {
    expect(plan([], [onTheWay('b1', 6), meetup('r1', 20)], [B1])).toEqual([
      { type: 'start', link: R1, subject: meetup('r1', 20) },
    ]);
  });

  test('with two live items, the one due soonest starts', () => {
    expect(topSubject([meetup('r1', 20), onTheWay('b1', 6)])).toEqual(onTheWay('b1', 6));
    expect(topSubject([meetup('r1', 5), onTheWay('b1', 6)])).toEqual(meetup('r1', 5));
  });

  test('a tie goes to the bounty', () => {
    expect(topSubject([meetup('r1', 6), onTheWay('b1', 6)])?.kind).toBe('bounty');
  });

  test('a running activity keeps its place when another item becomes more urgent', () => {
    expect(plan([{ id: 'a1', link: R1 }], [meetup('r1', 20), onTheWay('b1', 6)])).toEqual([
      { type: 'update', id: 'a1', subject: meetup('r1', 20) },
    ]);
  });
});

describe('updating', () => {
  test('a running activity whose item is still live is updated', () => {
    expect(plan([{ id: 'a1', link: B1 }], [onTheWay('b1', 9)])).toEqual([
      { type: 'update', id: 'a1', subject: onTheWay('b1', 9) },
    ]);
  });

  test('activities this controller did not start (the Debug scene) are left alone', () => {
    expect(plan([{ id: 'dbg', link: 'tapiro://bounty/status/debug-bounty' }], [], [])).toEqual([]);
    expect(plan([{ id: 'x', link: null }], [], [])).toEqual([]);
  });

  test('a second activity for the same item ends at once', () => {
    expect(
      plan(
        [
          { id: 'a1', link: B1 },
          { id: 'a2', link: B1 },
        ],
        [onTheWay('b1', 6)],
      ),
    ).toEqual([
      { type: 'update', id: 'a1', subject: onTheWay('b1', 6) },
      { type: 'end', id: 'a2', subject: null, dismissAfterSeconds: 0 },
    ]);
  });
});

describe('ending (277 A)', () => {
  test('an item whose row could not be read is left as it is, and nothing else starts', () => {
    expect(plan([{ id: 'a1', link: B1 }], [onTheWay('b2', 3)], [B1], [B1])).toEqual([]);
  });

  test('the linger never exceeds 15 minutes when the server clock runs ahead', () => {
    expect(plan([{ id: 'a1', link: B1 }], [arrived('b1', -3)])).toEqual([
      { type: 'end', id: 'a1', subject: arrived('b1', -3), dismissAfterSeconds: 900 },
    ]);
  });

  test('arrival ends with the final step and lingers 15 minutes', () => {
    expect(plan([{ id: 'a1', link: B1 }], [arrived('b1', 0)])).toEqual([
      { type: 'end', id: 'a1', subject: arrived('b1', 0), dismissAfterSeconds: 900 },
    ]);
  });

  test('departure seen late lingers only for what is left of the 15 minutes', () => {
    expect(plan([{ id: 'a1', link: R1 }], [departed('r1', 10)])).toEqual([
      { type: 'end', id: 'a1', subject: departed('r1', 10), dismissAfterSeconds: 300 },
    ]);
  });

  test('a cancelled item (gone from the list) ends at once', () => {
    expect(plan([{ id: 'a1', link: B1 }], [])).toEqual([
      { type: 'end', id: 'a1', subject: null, dismissAfterSeconds: 0 },
    ]);
  });

  test('when the shown item ends, the next live item starts', () => {
    expect(plan([{ id: 'a1', link: B1 }], [arrived('b1', 0), onTheWay('b2', 8)])).toEqual([
      { type: 'end', id: 'a1', subject: arrived('b1', 0), dismissAfterSeconds: 900 },
      { type: 'start', link: B2, subject: onTheWay('b2', 8) },
    ]);
  });
});

describe('after a relaunch', () => {
  test('the running activity found by list is updated, not started twice', () => {
    expect(plan([{ id: 'kept', link: B1 }], [onTheWay('b1', 4)], [B1])).toEqual([
      { type: 'update', id: 'kept', subject: onTheWay('b1', 4) },
    ]);
  });

  test('an item that arrived while the app was closed ends with what is left of its linger', () => {
    expect(plan([{ id: 'kept', link: B1 }], [arrived('b1', 14)], [B1])).toEqual([
      { type: 'end', id: 'kept', subject: arrived('b1', 14), dismissAfterSeconds: 60 },
    ]);
  });

  test('an item past its linger ends at once', () => {
    expect(plan([{ id: 'kept', link: B1 }], [arrived('b1', 20)], [B1])).toEqual([
      { type: 'end', id: 'kept', subject: arrived('b1', 20), dismissAfterSeconds: 0 },
    ]);
  });

  test('the started record keeps links still listed or still running, and drops the rest', () => {
    const kept = keptStarted(new Set([B1, B2, R1]), [{ id: 'a', link: R1 }], [onTheWay('b1', 4)]);
    expect([...kept].sort()).toEqual([B1, R1]);
  });
});
