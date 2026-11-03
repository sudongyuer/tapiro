import { describe, expect, test } from 'bun:test';

import { emptyDraft, type RideDraft } from './draft';
import { checkRideDraft, flightTime, parseEstimate } from './validate';

const NOW = new Date('2026-11-02T14:07:00Z');
const place = (label: string, short: string) => ({
  label,
  latitude: 3.06,
  longitude: 101.61,
  short,
  shortEdited: false,
});

function draft(patch: Partial<RideDraft> = {}): RideDraft {
  return {
    ...emptyDraft('11111111-1111-4111-8111-111111111111', 'MYR'),
    start: place('Sunway Geo Residences 大堂', '双威'),
    dest: place('KLIA2 第 2 航站楼', 'KLIA2'),
    departAt: '2026-11-02T22:30:00.000Z',
    ...patch,
  };
}

describe('ride draft', () => {
  test('a filled draft becomes publish_ride arguments', () => {
    const checked = checkRideDraft(
      draft({
        estimateText: '76',
        airportOpen: true,
        flightClock: '09:10',
        largeBags: 2,
        noteOpen: true,
        note: '  大堂门口  ',
        splitMode: 'grab',
      }),
      NOW,
    );
    expect(checked.ok && checked.args).toMatchObject({
      start_short: '双威',
      dest_short: 'KLIA2',
      seats: 4,
      currency: 'MYR',
      estimate_minor: 7600,
      flight_departs_at: '2026-11-03T01:10:00.000Z',
      large_bags: 2,
      meeting_note: '大堂门口',
      split_mode: 'grab',
    });
  });

  test('a closed airport group and a closed note send nothing', () => {
    const checked = checkRideDraft(
      draft({ airportOpen: false, flightClock: '09:10', largeBags: 2, note: 'x', noteOpen: false }),
      NOW,
    );
    expect(checked.ok && checked.args).toMatchObject({
      flight_departs_at: null,
      large_bags: null,
      meeting_note: null,
      estimate_minor: null,
    });
  });

  test('each missing or broken field names its error', () => {
    expect(checkRideDraft(draft({ start: null }), NOW)).toEqual({ ok: false, error: 'startEmpty' });
    expect(checkRideDraft(draft({ dest: null }), NOW)).toEqual({ ok: false, error: 'destEmpty' });
    expect(checkRideDraft(draft({ dest: place('KLIA2', '吉隆坡第二国际机场') }), NOW)).toEqual({
      ok: false,
      error: 'shortName',
    });
    expect(checkRideDraft(draft({ departAt: null }), NOW)).toEqual({
      ok: false,
      error: 'timeEmpty',
    });
    expect(checkRideDraft(draft({ departAt: '2026-11-02T14:00:00Z' }), NOW)).toEqual({
      ok: false,
      error: 'timePast',
    });
    expect(checkRideDraft(draft({ departAt: '2026-12-05T00:00:00Z' }), NOW)).toEqual({
      ok: false,
      error: 'timeTooFar',
    });
    expect(checkRideDraft(draft({ estimateText: '0.5' }), NOW)).toEqual({
      ok: false,
      error: 'estimateRange',
    });
    expect(checkRideDraft(draft({ estimateText: '1000.01' }), NOW)).toEqual({
      ok: false,
      error: 'estimateRange',
    });
    expect(checkRideDraft(draft({ noteOpen: true, note: 'x'.repeat(141) }), NOW)).toEqual({
      ok: false,
      error: 'noteTooLong',
    });
  });

  test('the limits are the ride post_limits: RM 1000 and ¥1600 pass', () => {
    expect(checkRideDraft(draft({ estimateText: '1000' }), NOW).ok).toBe(true);
    expect(checkRideDraft(draft({ estimateText: '1600', currency: 'CNY' }), NOW).ok).toBe(true);
    expect(checkRideDraft(draft({ estimateText: '1600', currency: 'MYR' }), NOW).ok).toBe(false);
  });

  test('the estimate reads whole and decimal amounts', () => {
    expect(parseEstimate('76', 'MYR')).toEqual({ minor: 7600, currency: 'MYR' });
    expect(parseEstimate('24.5', 'MYR')).toEqual({ minor: 2450, currency: 'MYR' });
    expect(parseEstimate('1,000', 'MYR')).toBeNull();
    expect(parseEstimate('12.345', 'MYR')).toBeNull();
    expect(parseEstimate('abc', 'MYR')).toBeNull();
  });

  test('a flight clock earlier than the departure is the next day', () => {
    expect(flightTime('2026-11-02T22:30:00.000Z', '09:10')).toBe('2026-11-03T01:10:00.000Z');
    expect(flightTime('2026-11-03T01:00:00.000Z', '06:00')).toBe('2026-11-03T22:00:00.000Z');
  });
});
