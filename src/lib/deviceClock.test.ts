import { describe, expect, test } from 'bun:test';

import { addDays, localClock, localDayKey, localTimeOn } from './deviceClock';
import { inTimeZone } from './inTimeZone';

const LATE_UTC = Date.parse('2026-11-03T16:30:00Z');

describe('the device clock', () => {
  test('one instant reads as the clock and day of the device zone', () => {
    inTimeZone('Asia/Kuala_Lumpur', () => {
      expect(localClock(LATE_UTC)).toBe('00:30');
      expect(localDayKey(LATE_UTC)).toBe('2026-11-04');
    });
    inTimeZone('Europe/London', () => {
      expect(localClock(LATE_UTC)).toBe('16:30');
      expect(localDayKey(LATE_UTC)).toBe('2026-11-03');
    });
    inTimeZone('America/Los_Angeles', () => {
      expect(localClock(LATE_UTC)).toBe('08:30');
      expect(localDayKey(LATE_UTC)).toBe('2026-11-03');
    });
  });

  test('a day and clock become the instant in the device zone', () => {
    inTimeZone('Asia/Kuala_Lumpur', () => {
      expect(new Date(localTimeOn('2026-11-03', 17, 30)).toISOString()).toBe(
        '2026-11-03T09:30:00.000Z',
      );
    });
    inTimeZone('Europe/London', () => {
      expect(new Date(localTimeOn('2026-11-03', 17, 30)).toISOString()).toBe(
        '2026-11-03T17:30:00.000Z',
      );
    });
  });

  test('adding days follows the calendar across months, years and a clock change', () => {
    inTimeZone('America/Los_Angeles', () => {
      expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
      const before = localTimeOn('2026-10-31', 9, 0);
      const after = localTimeOn(addDays('2026-10-31', 1), 9, 0);
      expect(after - before).toBe(25 * 3_600_000);
      expect(localClock(after)).toBe('09:00');
    });
  });
});
