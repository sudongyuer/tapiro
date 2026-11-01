import { describe, expect, test } from 'bun:test';

import { addedTime, moveStart, switchKind, timeBounds } from './timeChoice';
import { checkDraft } from './validate';
import type { PostDraft, TimeChoice } from './types';

const NOW = new Date('2026-10-27T09:02:30.000Z');
const HOUR = 3_600_000;

const draft = (time: TimeChoice): PostDraft => ({
  id: 'id',
  title: '取快递',
  category: 'pickup',
  categorySource: 'chosen',
  art: null,
  rewardText: '8',
  currency: 'MYR',
  description: null,
  time,
  place: null,
  updatedAt: NOW.toISOString(),
});

describe('time row choices', () => {
  test('a new time is a deadline two hours ahead on a five-minute step', () => {
    expect(addedTime(NOW)).toEqual({ kind: 'deadline', deadlineAt: '2026-10-27T11:05:00.000Z' });
    expect(checkDraft(draft(addedTime(NOW)), NOW).ok).toBe(true);
  });

  test('switching to a window starts at the deadline and lasts an hour', () => {
    const window = switchKind(addedTime(NOW), 'window', NOW);
    expect(window).toEqual({
      kind: 'window',
      startsAt: '2026-10-27T11:05:00.000Z',
      endsAt: '2026-10-27T12:05:00.000Z',
    });
    expect(checkDraft(draft(window), NOW).ok).toBe(true);
  });

  test('switching back to a deadline keeps the window end', () => {
    const window = switchKind(addedTime(NOW), 'window', NOW);
    expect(switchKind(window, 'deadline', NOW)).toEqual({
      kind: 'deadline',
      deadlineAt: '2026-10-27T12:05:00.000Z',
    });
  });

  test('choosing the same kind changes nothing', () => {
    const time = addedTime(NOW);
    expect(switchKind(time, 'deadline', NOW)).toBe(time);
  });

  test('moving the start keeps the window length, so the end stays after it', () => {
    const window = {
      kind: 'window' as const,
      startsAt: '2026-10-28T10:00:00.000Z',
      endsAt: '2026-10-28T13:00:00.000Z',
    };
    const moved = moveStart(window, new Date('2026-10-28T14:00:00.000Z'));
    expect(moved.endsAt).toBe('2026-10-28T17:00:00.000Z');
    expect(checkDraft(draft(moved), NOW).ok).toBe(true);
  });

  test('pickers are bounded by now and the 30-day limit', () => {
    const { start, end } = timeBounds(NOW);
    expect(start.getTime()).toBe(NOW.getTime());
    expect(end.getTime() - start.getTime()).toBe(30 * 24 * HOUR);
  });
});
