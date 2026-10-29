import { describe, expect, test } from 'bun:test';

import { defaultEta, earliestEta, sameMinute } from './etaTime';

describe('defaultEta', () => {
  test('starts 30 minutes ahead, rounded up to five minutes', () => {
    expect(defaultEta(new Date('2026-10-29T09:41:20Z')).toISOString()).toBe(
      '2026-10-29T10:15:00.000Z',
    );
  });

  test('keeps a time already on a five-minute mark', () => {
    expect(defaultEta(new Date('2026-10-29T09:40:00Z')).toISOString()).toBe(
      '2026-10-29T10:10:00.000Z',
    );
  });

  test('crosses midnight', () => {
    expect(defaultEta(new Date('2026-10-29T23:52:00Z')).toISOString()).toBe(
      '2026-10-30T00:25:00.000Z',
    );
  });
});

describe('earliestEta', () => {
  test('is the next whole minute, never now', () => {
    expect(earliestEta(new Date('2026-10-29T09:41:00Z')).toISOString()).toBe(
      '2026-10-29T09:42:00.000Z',
    );
    expect(earliestEta(new Date('2026-10-29T09:41:30Z')).toISOString()).toBe(
      '2026-10-29T09:42:00.000Z',
    );
  });
});

describe('sameMinute', () => {
  test('compares to the minute', () => {
    expect(sameMinute(new Date('2026-10-29T10:15:40Z'), '2026-10-29T10:15:00.000Z')).toBe(true);
    expect(sameMinute(new Date('2026-10-29T10:20:00Z'), '2026-10-29T10:15:00.000Z')).toBe(false);
    expect(sameMinute(new Date('2026-10-29T10:15:00Z'), null)).toBe(false);
  });
});
