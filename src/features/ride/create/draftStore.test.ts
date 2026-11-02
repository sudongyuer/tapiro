import { describe, expect, test } from 'bun:test';

import { createRideDraftStore, isEmptyDraft } from './draft';
import { addRecent, createRecentRoutes, type RecentRoute } from './recentRoutes';
import { customStart, quickPicks } from './timePicks';

function memorySettings() {
  const values = new Map<string, unknown>();
  return {
    get: (key: string) => values.get(key),
    set: (next: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(next)) values.set(key, value);
    },
  };
}

const place = (label: string) => ({
  label,
  latitude: 3,
  longitude: 101,
  short: label,
  shortEdited: false,
});
const route = (from: string, to: string, at: string): RecentRoute => ({
  start: place(from),
  dest: place(to),
  seats: 4,
  at,
});

describe('ride draft store', () => {
  test('a draft survives a new store on the same settings, and reset empties it', () => {
    const settings = memorySettings();
    let id = 0;
    const make = () =>
      createRideDraftStore(
        settings,
        () => `id-${++id}`,
        () => 'MYR',
      );
    const first = make();
    first.update('u', { start: place('Geo'), estimateText: '76' });
    const again = make().load('u');
    expect(again.start?.label).toBe('Geo');
    expect(again.estimateText).toBe('76');
    expect(isEmptyDraft(again)).toBe(false);
    first.reset('u');
    expect(isEmptyDraft(first.load('u'))).toBe(true);
    expect(isEmptyDraft(make().load('u'))).toBe(true);
  });

  test('a stored draft with a broken place drops only that place', () => {
    const settings = memorySettings();
    settings.set({
      'tapiro.rideDraft.u': JSON.stringify({ id: 'x', start: { label: 1 }, seats: 3 }),
    });
    const draft = createRideDraftStore(
      settings,
      () => 'new',
      () => 'MYR',
    ).load('u');
    expect(draft).toMatchObject({ id: 'x', start: null, seats: 3, splitMode: 'tapiro' });
  });
});

describe('recent routes', () => {
  test('the newest two, without repeats', () => {
    const one = route('A', 'B', '2026-11-01T00:00:00Z');
    const two = route('C', 'D', '2026-11-01T01:00:00Z');
    const three = route('A', 'B', '2026-11-02T00:00:00Z');
    expect(addRecent(addRecent(addRecent([], one), two), three)).toEqual([three, two]);
    const store = createRecentRoutes(memorySettings());
    store.add('u', one);
    store.add('u', two);
    expect(store.list('u').map((r) => r.start.label)).toEqual(['C', 'A']);
    store.clear('u');
    expect(store.list('u')).toEqual([]);
  });
});

describe('time picks', () => {
  test('two half-hour picks at least 30 minutes ahead', () => {
    const now = Date.parse('2026-11-02T12:52:00Z');
    expect(quickPicks(now).map((time) => new Date(time).toISOString())).toEqual([
      '2026-11-02T13:30:00.000Z',
      '2026-11-02T14:00:00.000Z',
    ]);
    expect(new Date(customStart(now)).toISOString()).toBe('2026-11-02T14:00:00.000Z');
  });
});
