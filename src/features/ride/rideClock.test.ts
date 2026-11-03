import { describe, expect, test } from 'bun:test';

import { MALAYSIA_TIME_ZONE, malaysiaClock, malaysiaDayKey, malaysiaTime } from './rideClock';

const pickerClock = (time: number) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: MALAYSIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(time);

const pickerDay = (time: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: MALAYSIA_TIME_ZONE }).format(time);

describe('the picker zone and the ride clock', () => {
  const instants = [
    Date.parse('2026-11-03T09:30:00Z'),
    Date.parse('2026-11-03T15:59:00Z'),
    Date.parse('2026-11-03T16:00:00Z'),
    Date.parse('2026-12-31T23:45:00Z'),
  ];

  test('a picker driven in the ride zone shows the clock and day the ticket shows', () => {
    for (const time of instants) {
      expect(pickerClock(time)).toBe(malaysiaClock(time));
      expect(pickerDay(time)).toBe(malaysiaDayKey(time));
    }
  });

  test('17:30 on the ticket is 17:30 in the picker, not the device zone', () => {
    const departs = malaysiaTime('2026-11-03', 17, 30);
    expect(new Date(departs).toISOString()).toBe('2026-11-03T09:30:00.000Z');
    expect(pickerClock(departs)).toBe('17:30');
  });
});
