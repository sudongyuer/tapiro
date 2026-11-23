import { describe, expect, test } from 'bun:test';

import { ETA_GRACE_MS, etaLate, etaTextChangesAt } from './etaLate';

const MINUTE = 60_000;
const ETA = Date.UTC(2026, 10, 24, 4, 0);

describe('etaLate', () => {
  test('an arrival time is not late until the five-minute grace has passed', () => {
    expect(ETA_GRACE_MS).toBe(5 * MINUTE);
    expect(etaLate(ETA, ETA - MINUTE)).toBeNull();
    expect(etaLate(ETA, ETA + 5 * MINUTE - 1)).toBeNull();
    expect(etaLate(ETA, ETA + 5 * MINUTE)).toEqual({ unit: 'minutes', count: 5 });
  });

  test('minutes count whole minutes past the arrival time, then whole hours', () => {
    expect(etaLate(ETA, ETA + 59 * MINUTE + 59_000)).toEqual({ unit: 'minutes', count: 59 });
    expect(etaLate(ETA, ETA + 60 * MINUTE)).toEqual({ unit: 'hours', count: 1 });
    expect(etaLate(ETA, ETA + 179 * MINUTE)).toEqual({ unit: 'hours', count: 2 });
  });

  test('the text next changes at the end of the grace, then on every minute', () => {
    expect(etaTextChangesAt(ETA, ETA - 10 * MINUTE)).toBe(ETA + 5 * MINUTE);
    expect(etaTextChangesAt(ETA, ETA + 5 * MINUTE)).toBe(ETA + 6 * MINUTE);
    expect(etaTextChangesAt(ETA, ETA + 6 * MINUTE + 30_000)).toBe(ETA + 7 * MINUTE);
  });
});
