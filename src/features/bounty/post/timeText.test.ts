import { describe, expect, test } from 'bun:test';

import { inTimeZone } from '@/lib/inTimeZone';

import { dateText, timeParts } from './timeText';

const MONTH_START_IN_MALAYSIA = '2026-10-31T16:00:00Z';

describe('bounty dates in the device zone', () => {
  test('the day free posts come back is the day that instant falls on the device', () => {
    expect(
      inTimeZone('Asia/Kuala_Lumpur', () => dateText(MONTH_START_IN_MALAYSIA, 'zh-Hans')),
    ).toBe('11月1日');
    expect(inTimeZone('Europe/London', () => dateText(MONTH_START_IN_MALAYSIA, 'zh-Hans'))).toBe(
      '10月31日',
    );
  });

  test('今天 and the clock of a deadline follow the device zone', () => {
    const now = new Date('2026-11-03T10:00:00Z');
    const kl = inTimeZone('Asia/Kuala_Lumpur', () => timeParts('2026-11-03T16:30:00Z', 'en', now));
    const london = inTimeZone('Europe/London', () => timeParts('2026-11-03T16:30:00Z', 'en', now));
    expect([kl.day, kl.clock]).toEqual(['tomorrow', '00:30']);
    expect([london.day, london.clock]).toEqual(['today', '16:30']);
  });
});
