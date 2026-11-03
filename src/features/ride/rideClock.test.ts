import { describe, expect, test } from 'bun:test';

import { localClock, localDayKey, localTimeOn } from '@/lib/deviceClock';
import { inTimeZone } from '@/lib/inTimeZone';

import { dayRelation } from './rideClock';

const pickerClock = (time: number) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(time);

const pickerDay = (time: number) => new Intl.DateTimeFormat('en-CA').format(time);

const ZONES = ['Asia/Kuala_Lumpur', 'Europe/London', 'America/Los_Angeles'];

describe('the picker zone and the ride clock', () => {
  const instants = [
    Date.parse('2026-11-03T09:30:00Z'),
    Date.parse('2026-11-03T15:59:00Z'),
    Date.parse('2026-11-03T16:00:00Z'),
    Date.parse('2026-12-31T23:45:00Z'),
  ];

  test('a picker in the device zone shows the clock and day the ticket shows', () => {
    for (const zone of ZONES) {
      inTimeZone(zone, () => {
        for (const time of instants) {
          expect(pickerClock(time)).toBe(localClock(time));
          expect(pickerDay(time)).toBe(localDayKey(time));
        }
      });
    }
  });

  test('17:30 on the ticket is 17:30 in the picker, whichever zone the device is in', () => {
    for (const zone of ZONES) {
      inTimeZone(zone, () => {
        expect(pickerClock(localTimeOn('2026-11-03', 17, 30))).toBe('17:30');
      });
    }
  });
});

describe('day relation', () => {
  const now = Date.parse('2026-11-03T15:30:00Z');

  test('今天 and 明天 follow the device day', () => {
    inTimeZone('Asia/Kuala_Lumpur', () => {
      expect(dayRelation('2026-11-03', now)).toBe('today');
      expect(dayRelation('2026-11-04', now)).toBe('tomorrow');
      expect(dayRelation('2026-11-05', now)).toBe('other');
    });
    inTimeZone('America/Los_Angeles', () => {
      expect(dayRelation('2026-11-03', now)).toBe('today');
      expect(dayRelation('2026-11-04', now)).toBe('tomorrow');
    });
  });

  test('the same instant is a different day in another zone', () => {
    const late = Date.parse('2026-11-03T16:30:00Z');
    inTimeZone('Asia/Kuala_Lumpur', () => {
      expect(dayRelation(localDayKey(late), now)).toBe('tomorrow');
    });
    inTimeZone('Europe/London', () => {
      expect(dayRelation(localDayKey(late), now)).toBe('today');
    });
  });
});
