import { describe, expect, test } from 'bun:test';

import {
  departsAt,
  gathersAt,
  inHistory,
  isExpired,
  isGathering,
  lateUntil,
  leavingCountsAsNoShow,
} from './rideTimes';

const RIDE = { departAt: '2026-11-02T10:00:00.000Z', revisedAt: null };
const REVISED = { departAt: '2026-11-02T10:00:00.000Z', revisedAt: '2026-11-02T10:20:00.000Z' };
const t = (iso: string) => Date.parse(iso);

describe('ride time nodes', () => {
  test('集合 starts 30 minutes before departure', () => {
    expect(gathersAt(RIDE)).toBe(t('2026-11-02T09:30:00.000Z'));
    expect(isGathering(RIDE, t('2026-11-02T09:29:59.999Z'))).toBe(false);
    expect(isGathering(RIDE, t('2026-11-02T09:30:00.000Z'))).toBe(true);
  });

  test('a revised time moves every node, the old time is only struck through', () => {
    expect(departsAt(REVISED)).toBe(t('2026-11-02T10:20:00.000Z'));
    expect(isGathering(REVISED, t('2026-11-02T09:40:00.000Z'))).toBe(false);
    expect(leavingCountsAsNoShow(REVISED, t('2026-11-02T10:04:00.000Z'))).toBe(false);
    expect(leavingCountsAsNoShow(REVISED, t('2026-11-02T10:05:00.000Z'))).toBe(true);
  });

  test('leaving inside 15 minutes before departure counts as a no-show', () => {
    expect(leavingCountsAsNoShow(RIDE, t('2026-11-02T09:44:59.000Z'))).toBe(false);
    expect(leavingCountsAsNoShow(RIDE, t('2026-11-02T09:45:00.000Z'))).toBe(true);
  });

  test('a ride without 出发 expires 2 hours after departure and stops gathering', () => {
    expect(isExpired(RIDE, t('2026-11-02T11:59:59.000Z'))).toBe(false);
    expect(isExpired(RIDE, t('2026-11-02T12:00:00.000Z'))).toBe(true);
    expect(isGathering(RIDE, t('2026-11-02T12:00:00.000Z'))).toBe(false);
  });

  test('a settled ride moves to history 24 hours after settling', () => {
    const settled = '2026-11-02T12:00:00.000Z';
    expect(inHistory(settled, t('2026-11-03T11:59:59.000Z'))).toBe(false);
    expect(inHistory(settled, t('2026-11-03T12:00:00.000Z'))).toBe(true);
    expect(inHistory(null, t('2026-11-09T12:00:00.000Z'))).toBe(false);
  });

  test('晚到 adds the chosen minutes to now', () => {
    expect(lateUntil(t('2026-11-02T09:50:00.000Z'), 10)).toBe('2026-11-02T10:00:00.000Z');
  });
});
