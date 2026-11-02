import { describe, expect, test } from 'bun:test';

import { settleScene } from './fixtureSettle';
import { emptySplit, shareText, splitView, toSplitInput } from './splitDraft';

const NOW = Date.UTC(2026, 10, 2, 23, 24);
const reach = { ...settleScene('reach', NOW), status: 'arrived' as const };

describe('the split sheet (211 A, 220 A)', () => {
  test('RM 74.00 for three: riders pay RM 24.70, the organiser keeps the extra 0.10', () => {
    const view = splitView(reach, { ...emptySplit(), totalText: '74' });
    expect(view.rows.map((row) => row.share?.minor)).toEqual([2470, 2470]);
    expect(view.organiser).toEqual({ minor: 2460, currency: 'MYR' });
    expect(view.extra).toEqual({ minor: 10, currency: 'MYR' });
    expect(view.issue).toBeNull();
  });

  test('editing one rider keeps the others fixed and the organiser takes the remainder', () => {
    const [ming] = reach.members?.filter((m) => m.status === 'boarded' && !m.organiser) ?? [];
    const view = splitView(reach, {
      ...emptySplit(),
      totalText: '74',
      shares: { [ming.id]: '20' },
    });
    expect(view.rows.map((row) => row.share?.minor)).toEqual([2000, 2470]);
    expect(view.organiser?.minor).toBe(2930);
    expect(view.extra).toBeNull();
    expect(view.equal).toBe(false);
  });

  test('sending is blocked while the others exceed the total', () => {
    const [ming] = reach.members?.filter((m) => m.status === 'boarded' && !m.organiser) ?? [];
    const view = splitView(reach, {
      ...emptySplit(),
      totalText: '74',
      shares: { [ming.id]: '60' },
    });
    expect(view.issue).toBe('overTotal');
    expect(toSplitInput(view, null)).toBeNull();
  });

  test('an empty, unreadable or out-of-range total cannot be sent', () => {
    expect(splitView(reach, emptySplit()).issue).toBe('totalEmpty');
    expect(splitView(reach, { ...emptySplit(), totalText: '7,4.0.0' }).issue).toBe('totalRange');
    expect(splitView(reach, { ...emptySplit(), totalText: '0.50' }).issue).toBe('totalRange');
    expect(splitView(reach, { ...emptySplit(), totalText: '1000.01' }).issue).toBe('totalRange');
    expect(splitView(reach, { ...emptySplit(), totalText: '1000' }).issue).toBeNull();
  });

  test('a ¥ ride uses the ¥ limit and its own currency', () => {
    const cny = { ...reach, currency: 'CNY' as const };
    expect(splitView(cny, { ...emptySplit(), totalText: '1600' }).total).toEqual({
      minor: 160_000,
      currency: 'CNY',
    });
    expect(splitView(cny, { ...emptySplit(), totalText: '1600.01' }).issue).toBe('totalRange');
  });

  test('a half-typed share blocks sending instead of guessing', () => {
    const [ming] = reach.members?.filter((m) => m.status === 'boarded' && !m.organiser) ?? [];
    const view = splitView(reach, {
      ...emptySplit(),
      totalText: '74',
      shares: { [ming.id]: 'abc' },
    });
    expect(view.issue).toBe('shareText');
  });

  test('the input carries every rider and the uploaded receipt path', () => {
    const view = splitView(reach, { ...emptySplit(), totalText: '74.00' });
    expect(toSplitInput(view, 'ride/x.jpg')).toEqual({
      totalMinor: 7400,
      shares: view.rows.map((row) => ({ memberId: row.id, minor: 2470 })),
      receipt: 'ride/x.jpg',
    });
    expect(shareText({ minor: 2470, currency: 'MYR' })).toBe('24.70');
  });
});
