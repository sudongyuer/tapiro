import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { settleScene } from './fixtureSettle';
import { settleTicket } from './settleTicketView';
import { FIXTURE_VIEWER } from './fixtureDetails';

const NOW = Date.parse('2026-11-03T02:05:00Z');
const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

describe('the settled ticket (217 A, 218 A)', () => {
  test('a Tapiro ride the organiser rode alone is not labelled as split in Grab', () => {
    const alone = {
      ...settleScene('grabSettled', NOW),
      splitMode: 'tapiro' as const,
      members: settleScene('grabSettled', NOW).members?.filter((m) => m.organiser) ?? null,
    };
    const ticket = settleTicket(alone, FIXTURE_VIEWER, NOW, t, 'zh-Hans');
    expect(ticket?.lead?.text).toBe(t('rideSettle.ticket.leadDone'));
    expect(ticket?.cells.map((c) => c.value)).not.toContain(t('rideSettle.ticket.fareGrab'));
    expect(ticket?.stamp).toBe(true);
  });

  test('a Grab-split ride reads 在 Grab 里分', () => {
    const ticket = settleTicket(settleScene('grabSettled', NOW), FIXTURE_VIEWER, NOW, t, 'zh-Hans');
    expect(ticket?.lead?.text).toBe(t('rideSettle.ticket.leadGrab'));
    expect(ticket?.cells.map((c) => c.value)).toContain(t('rideSettle.ticket.fareGrab'));
  });
});
