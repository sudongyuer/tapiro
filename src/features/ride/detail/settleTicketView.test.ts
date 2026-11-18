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

describe('the organiser’s settling ticket (214 A)', () => {
  test('equal shares show the Grab total, each and yours', () => {
    const ticket = settleTicket(settleScene('paidSome', NOW), FIXTURE_VIEWER, NOW, t, 'zh-Hans');
    expect(ticket?.cells.map((c) => c.key)).toEqual(['total', 'each', 'yours']);
  });

  test('unequal shares drop 每人 and keep the total and yours', () => {
    const scene = settleScene('paidSome', NOW);
    const settle = scene.settle;
    if (!settle) throw new Error('paidSome has no split');
    const uneven = {
      ...scene,
      settle: {
        ...settle,
        riders: settle.riders.map((r, i) =>
          i === 0 ? { ...r, share: { ...r.share, minor: r.share.minor + 100 } } : r,
        ),
      },
    };
    const ticket = settleTicket(uneven, FIXTURE_VIEWER, NOW, t, 'zh-Hans');
    expect(ticket?.cells.map((c) => c.key)).toEqual(['total', 'yours']);
  });
});
