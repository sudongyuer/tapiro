import { describe, expect, test } from 'bun:test';

import { draftPerPerson } from './create/draftTicket';
import { checkRideDraft } from './create/validate';
import { fixtureRecentRoutes, fixtureRideDraft } from './fixtureCreate';

const NOW = Date.parse('2026-11-02T14:07:00Z');
const ID = '11111111-1111-4111-8111-111111111111';

describe('create fixtures', () => {
  test('each seeded draft is publishable as it stands', () => {
    for (const seed of ['airport', 'mall', 'worst']) {
      const draft = fixtureRideDraft(seed, ID, NOW);
      expect(draft && checkRideDraft(draft, new Date(NOW)).ok).toBe(true);
    }
    expect(fixtureRideDraft(undefined, ID, NOW)).toBeNull();
  });

  test('the worst draft sits at every limit', () => {
    const draft = fixtureRideDraft('worst', ID, NOW)!;
    expect([...draft.start!.label]).toHaveLength(80);
    expect([...draft.start!.short]).toHaveLength(8);
    expect([...draft.note]).toHaveLength(140);
    expect(draft.seats).toBe(6);
    expect(draftPerPerson(draft)).toEqual({ minor: 26_700, currency: 'CNY' });
  });

  test('two recent routes only when asked', () => {
    expect(fixtureRecentRoutes(undefined, NOW)).toEqual([]);
    expect(fixtureRecentRoutes('two', NOW).map((route) => route.dest.short)).toEqual([
      'YC',
      '双威',
    ]);
  });
});
