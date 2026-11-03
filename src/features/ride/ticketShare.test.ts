import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { rideTicketView } from './ticketView';
import type { MyRide } from './types';

const NOW = Date.parse('2026-11-03T02:20:00Z');

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

function settled(patch: Partial<MyRide> = {}): MyRide {
  return {
    id: 'r',
    start: { label: 'Sunway Geo', short: '双威', kind: 'home' },
    dest: { label: 'KLIA2', short: 'KLIA2', kind: 'airport' },
    departAt: new Date(NOW - 4 * 3_600_000).toISOString(),
    revisedAt: null,
    day: '2026-11-03',
    status: 'closed',
    seats: 4,
    taken: 3,
    splitMode: 'tapiro',
    estimate: { minor: 7600, currency: 'MYR' },
    airport: true,
    flightDepartsAt: null,
    largeBags: null,
    settledAt: new Date(NOW - 15 * 60_000).toISOString(),
    organiserName: '小林',
    role: 'member',
    myStatus: 'boarded',
    pendingRequests: 0,
    myShare: { minor: 2470, currency: 'MYR' },
    myPaid: 'settled',
    ...patch,
  };
}

const view = (ride: MyRide) =>
  rideTicketView(ride, { now: NOW, mine: ride, showDay: true }, t, 'zh-Hans');

describe('the settled ticket stub (219 A)', () => {
  test('a rider who settled sees what they paid, and VoiceOver reads 你付了', () => {
    const shown = view(settled());
    expect(shown.fare).toBe(t('rideSettle.list.youPaid'));
    expect(shown.amount).toMatch(/RM\s?24\.70/);
    expect(shown.a11y).toContain(`${t('rideSettle.list.youPaid')} ${shown.amount}`);
    expect(shown.a11y).not.toContain('每人约');
  });

  test('an unknown or missing paid state keeps the estimate wording instead of claiming payment', () => {
    for (const myPaid of [null, 'maybe' as MyRide['myPaid']]) {
      const shown = view(settled({ status: 'settling', myPaid }));
      expect(shown.fare).toBe(t('ride.ticket.perPerson', { taken: 3, seats: 4 }));
      expect(shown.a11y).toContain('每人约');
    }
  });

  test('a rider who still owes reads 你要付; the organiser reads 你出', () => {
    expect(view(settled({ status: 'settling', myPaid: 'due' })).fare).toBe(
      t('rideSettle.list.youPay'),
    );
    expect(view(settled({ role: 'organiser', myPaid: null })).fare).toBe(
      t('rideSettle.list.yours'),
    );
  });
});
