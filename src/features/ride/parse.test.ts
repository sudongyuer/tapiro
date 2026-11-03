import { describe, expect, test } from 'bun:test';

import { toMyRides, toNearbyPage, toRideSummary, toShortNameRows } from './parse';

const summary = {
  id: 'r1',
  start: { label: 'Sunway Geo Residences', short: '双威', kind: 'home' },
  dest: { label: 'KLIA2 第 2 航站楼', short: 'KLIA2', kind: 'airport' },
  departAt: '2026-11-03T06:30:00+08:00',
  revisedAt: null,
  day: '2026-11-03',
  status: 'open',
  seats: 3,
  taken: 2,
  splitMode: 'tapiro',
  estimate: { minor: 7600, currency: 'MYR' },
  reference: null,
  airport: true,
  flightDepartsAt: '2026-11-03T09:10:00+08:00',
  largeBags: 2,
  distanceM: 120,
  point: { latitude: 3.06, longitude: 101.61 },
  settledAt: null,
  organiser: { id: 'u1', name: '小林', tier: 'new' },
};

describe('ride parse', () => {
  test('a nearby_rides summary keeps the ticket fields in UTC', () => {
    const ride = toRideSummary(summary);
    expect(ride.departAt).toBe('2026-11-02T22:30:00.000Z');
    expect(ride.start).toEqual({ label: 'Sunway Geo Residences', short: '双威', kind: 'home' });
    expect(ride.estimate).toEqual({ minor: 7600, currency: 'MYR' });
    expect(ride.flightDepartsAt).toBe('2026-11-03T01:10:00.000Z');
    expect(ride.largeBags).toBe(2);
    expect(ride.organiserName).toBe('小林');
  });

  test('an unknown status or currency is an error, not a guess', () => {
    expect(() => toRideSummary({ ...summary, status: 'boarding' })).toThrow();
    expect(() => toRideSummary({ ...summary, estimate: { minor: 1, currency: 'USD' } })).toThrow();
  });

  test('a page carries its cursor; the last page has none', () => {
    const page = toNearbyPage({
      items: [summary],
      next: { id: 'r1', latitude: null, longitude: null },
    });
    expect(page.items).toHaveLength(1);
    expect(page.next).toEqual({ id: 'r1', latitude: null, longitude: null });
    expect(toNearbyPage({ items: [], next: null }).next).toBeNull();
  });

  test('my_rides adds role, my status and pending requests, and the history count', () => {
    const mine = toMyRides({
      items: [{ ...summary, role: 'organiser', myStatus: 'accepted', pendingRequests: 1 }],
      historyCount: 4,
    });
    expect(mine.items[0]).toMatchObject({ role: 'organiser', pendingRequests: 1 });
    expect(mine.historyCount).toBe(4);
    const member = toMyRides({
      items: [{ ...summary, role: 'member', myStatus: 'accepted', pendingRequests: null }],
      historyCount: 0,
    });
    expect(member.items[0].pendingRequests).toBe(0);
  });

  test('my_rides carries the due time and 预计到 that reminders are built from', () => {
    const [owing] = toMyRides({
      items: [
        {
          ...summary,
          role: 'member',
          myStatus: 'boarded',
          myDueSince: '2026-11-04T10:30:00+08:00',
          eta: '2026-11-04T09:50:00+08:00',
        },
      ],
      historyCount: 0,
    }).items;
    expect(owing.myDueSince).toBe('2026-11-04T02:30:00.000Z');
    expect(owing.eta).toBe('2026-11-04T01:50:00.000Z');
    const [plain] = toMyRides({
      items: [{ ...summary, role: 'member', myStatus: 'accepted' }],
      historyCount: 0,
    }).items;
    expect([plain.myDueSince, plain.eta]).toEqual([null, null]);
  });

  test('short-name rows skip incomplete rows', () => {
    expect(
      toShortNameRows([
        { pattern: 'klia2', short_name: 'KLIA2', kind: 'airport' },
        { pattern: 'x', short_name: null, kind: null },
      ]),
    ).toEqual([{ pattern: 'klia2', shortName: 'KLIA2', kind: 'airport' }]);
  });
});
