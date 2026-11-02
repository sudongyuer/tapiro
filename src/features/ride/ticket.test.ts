import { describe, expect, test } from 'bun:test';

import { ticketModel } from './ticket';
import type { RideSummary } from './types';

const NOW = Date.parse('2026-11-02T14:07:00Z');
const MINUTE = 60_000;

function ride(patch: Partial<RideSummary> = {}): RideSummary {
  return {
    id: 'r',
    start: { label: 'Sunway Pyramid 正门', short: 'Pyramid', kind: 'mall' },
    dest: { label: 'YC Residence', short: 'YC', kind: null },
    departAt: new Date(NOW + 3 * 60 * MINUTE).toISOString(),
    revisedAt: null,
    day: '2026-11-02',
    status: 'open',
    seats: 4,
    taken: 1,
    splitMode: 'tapiro',
    estimate: { minor: 7600, currency: 'MYR' },
    airport: false,
    flightDepartsAt: null,
    largeBags: null,
    settledAt: null,
    organiserName: '小林',
    ...patch,
  };
}

describe('ticket', () => {
  test('inside 30 minutes it reads n 分钟后出发 in the urgent tone', () => {
    const model = ticketModel(ride({ departAt: new Date(NOW + 8 * MINUTE).toISOString() }), NOW);
    expect(model.status).toEqual({ kind: 'leaving', minutes: 8 });
    expect(model.tone).toBe('urgent');
  });

  test('a revised time moves the countdown', () => {
    const model = ticketModel(
      ride({
        departAt: new Date(NOW + 2 * MINUTE).toISOString(),
        revisedAt: new Date(NOW + 20 * MINUTE).toISOString(),
      }),
      NOW,
    );
    expect(model.status).toEqual({ kind: 'leaving', minutes: 20 });
  });

  test('the organiser sees waiting requests in the warning tone', () => {
    const model = ticketModel(ride(), NOW, { role: 'organiser', pendingRequests: 1 });
    expect(model.status).toEqual({ kind: 'requests', count: 1 });
    expect(model.tone).toBe('warning');
  });

  test('a full ride is neutral, and seats read taken/seats', () => {
    const model = ticketModel(ride({ seats: 3, taken: 3 }), NOW);
    expect(model.status).toEqual({ kind: 'full' });
    expect(model.muted).toBe(true);
    expect([model.taken, model.seats]).toEqual([3, 3]);
  });

  test('还差 counts the open seats; the organiser’s own reads 我发起的', () => {
    expect(ticketModel(ride({ taken: 2 }), NOW).status).toEqual({ kind: 'need', need: 2 });
    expect(ticketModel(ride(), NOW, { role: 'organiser', pendingRequests: 0 }).status).toEqual({
      kind: 'mine',
      need: 3,
    });
  });

  test('每人约 divides by seats before 出发 and by riders after (221)', () => {
    expect(ticketModel(ride({ seats: 4 }), NOW).perPerson).toEqual({
      minor: 1900,
      currency: 'MYR',
    });
    expect(ticketModel(ride({ seats: 4, taken: 2, status: 'departed' }), NOW).perPerson).toEqual({
      minor: 3800,
      currency: 'MYR',
    });
    expect(ticketModel(ride({ estimate: null }), NOW).perPerson).toBeNull();
  });

  test('the airport line shows only the fields that were filled', () => {
    const flight = Date.parse('2026-11-03T01:10:00Z');
    const model = ticketModel(
      ride({ airport: true, flightDepartsAt: new Date(flight).toISOString(), largeBags: 0 }),
      NOW,
    );
    expect(model.airport).toEqual({ flight, bags: null });
    expect(ticketModel(ride({ airport: true }), NOW).airport).toBeNull();
  });

  test('after 出发 the phase names the ticket', () => {
    expect(ticketModel(ride({ status: 'closed' }), NOW).status).toEqual({ kind: 'closed' });
    expect(ticketModel(ride({ status: 'cancelled' }), NOW).muted).toBe(true);
  });
});
