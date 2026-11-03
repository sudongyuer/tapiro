import { describe, expect, test } from 'bun:test';

import { createFixtureNotices } from './fixtureNotices';
import { canSchedule, shouldAskInContext, toPermission } from './permission';
import { outsideQuietHours } from './quietHours';
import { applyNoticeDiff, noticeDiff } from './reconcile';
import type { LocalNotice } from './types';

const my = (iso: string) => Date.parse(`${iso}+08:00`);

const notice = (id: string, at: number, body = 'b'): LocalNotice => ({
  id,
  at,
  title: 't',
  body,
  data: { kind: 'k', id },
});

describe('quiet hours (23:00–08:00 Malaysia)', () => {
  test('a time in the day stays', () => {
    expect(outsideQuietHours(my('2026-11-03T12:00:00'))).toBe(my('2026-11-03T12:00:00'));
    expect(outsideQuietHours(my('2026-11-03T22:59:00'))).toBe(my('2026-11-03T22:59:00'));
    expect(outsideQuietHours(my('2026-11-03T08:00:00'))).toBe(my('2026-11-03T08:00:00'));
  });

  test('late evening moves to the next morning', () => {
    expect(outsideQuietHours(my('2026-11-03T23:00:00'))).toBe(my('2026-11-04T08:00:00'));
    expect(outsideQuietHours(my('2026-11-03T23:59:00'))).toBe(my('2026-11-04T08:00:00'));
  });

  test('early morning moves to 08:00 the same day', () => {
    expect(outsideQuietHours(my('2026-11-04T00:30:00'))).toBe(my('2026-11-04T08:00:00'));
    expect(outsideQuietHours(my('2026-11-04T07:59:00'))).toBe(my('2026-11-04T08:00:00'));
  });
});

describe('noticeDiff', () => {
  const inRide = (id: string) => id.startsWith('ride:1:');
  const now = 1_000;

  test('schedules what is missing and keeps what matches', () => {
    const diff = noticeDiff(
      [{ id: 'ride:1:meetup', at: 5_000, title: 't', body: 'b' }],
      [notice('ride:1:meetup', 5_000), notice('ride:1:goOrCancel', 6_000)],
      inRide,
      now,
    );
    expect(diff.cancel).toEqual([]);
    expect(diff.schedule.map((n) => n.id)).toEqual(['ride:1:goOrCancel']);
  });

  test('a later time or new copy reschedules under the same identifier', () => {
    const diff = noticeDiff(
      [
        { id: 'ride:1:meetup', at: 5_000, title: 't', body: 'b' },
        { id: 'ride:1:arrive', at: 7_000, title: 't', body: 'b' },
      ],
      [notice('ride:1:meetup', 9_000), notice('ride:1:arrive', 7_000, 'other language')],
      inRide,
      now,
    );
    expect(diff.cancel).toEqual([]);
    expect(diff.schedule.map((n) => [n.id, n.at])).toEqual([
      ['ride:1:meetup', 9_000],
      ['ride:1:arrive', 7_000],
    ]);
  });

  test('cancels what is no longer wanted inside the scope only', () => {
    const diff = noticeDiff(
      [
        { id: 'ride:1:meetup', at: 5_000, title: 't', body: 'b' },
        { id: 'ride:2:meetup', at: 5_000, title: 't', body: 'b' },
        { id: 'bounty:9', at: 5_000, title: 't', body: 'b' },
      ],
      [],
      inRide,
      now,
    );
    expect(diff).toEqual({ cancel: ['ride:1:meetup'], schedule: [] });
  });

  test('a time already past is cancelled, never scheduled', () => {
    const diff = noticeDiff(
      [{ id: 'ride:1:meetup', at: 900, title: 't', body: 'b' }],
      [notice('ride:1:meetup', 900), notice('ride:1:pay24', 1_000)],
      inRide,
      now,
    );
    expect(diff).toEqual({ cancel: ['ride:1:meetup'], schedule: [] });
  });

  test('applying twice changes nothing the second time', async () => {
    const fake = createFixtureNotices('allowed', () => {});
    const desired = [notice('ride:1:meetup', 5_000), notice('ride:1:pay24', 6_000)];
    await applyNoticeDiff(
      fake.scheduler,
      noticeDiff(await fake.scheduler.scheduled(), desired, inRide, now),
    );
    const again = noticeDiff(await fake.scheduler.scheduled(), desired, inRide, now);
    expect(again).toEqual({ cancel: [], schedule: [] });
    expect((await fake.scheduler.scheduled()).map((n) => n.id).sort()).toEqual([
      'ride:1:meetup',
      'ride:1:pay24',
    ]);
  });
});

describe('permission', () => {
  test('provisional reads as provisional although the top-level status is undetermined', () => {
    expect(toPermission({ granted: false, ios: { status: 3 } })).toBe('provisional');
    expect(toPermission({ granted: false, ios: { status: 0 } })).toBe('undetermined');
    expect(toPermission({ granted: true, ios: { status: 2 } })).toBe('allowed');
    expect(toPermission({ granted: false, ios: { status: 1 } })).toBe('denied');
  });

  test('reminders are scheduled when allowed or provisional only', () => {
    expect(canSchedule('allowed')).toBe(true);
    expect(canSchedule('provisional')).toBe(true);
    expect(canSchedule('denied')).toBe(false);
    expect(canSchedule('undetermined')).toBe(false);
  });

  test('the in-context prompt is asked once, and never after a denial', () => {
    expect(shouldAskInContext('undetermined', false)).toBe(true);
    expect(shouldAskInContext('provisional', false)).toBe(true);
    expect(shouldAskInContext('provisional', true)).toBe(false);
    expect(shouldAskInContext('denied', false)).toBe(false);
    expect(shouldAskInContext('allowed', false)).toBe(false);
  });
});
