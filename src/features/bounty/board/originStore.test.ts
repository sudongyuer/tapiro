import { describe, expect, test } from 'bun:test';

import { createUserCleanups } from '@/lib/userCleanups';

import {
  createOriginStore,
  createShownOrigins,
  detailOrigin,
  evaluateOrigin,
  requestLocation,
  resolveOrigin,
  steadyOrigin,
  type ChosenPlace,
  type SettingsLike,
} from './originStore';
import type { BoardOrigin } from './types';

function memorySettings(): SettingsLike & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key) => values.get(key),
    set(next) {
      for (const [key, value] of Object.entries(next)) values.set(key, value);
    },
  };
}

const GEO: ChosenPlace = {
  label: 'Sunway Geo Residences',
  point: { latitude: 3.0657, longitude: 101.611 },
};
const HERE = { latitude: 3.0733, longitude: 101.6078 };

describe('originStore', () => {
  test('keeps the chosen place and the dismissed card per user', () => {
    const store = createOriginStore(memorySettings());
    store.setChosenPlace('a', GEO);
    store.dismissCard('a');
    expect(store.chosenPlace('a')).toEqual(GEO);
    expect(store.cardDismissed('a')).toBe(true);
    expect(store.chosenPlace('b')).toBeNull();
    expect(store.cardDismissed('b')).toBe(false);
  });

  test('survives a new store instance on the same settings', () => {
    const settings = memorySettings();
    createOriginStore(settings).setChosenPlace('a', GEO);
    createOriginStore(settings).dismissCard('a');
    const later = createOriginStore(settings);
    expect(later.chosenPlace('a')).toEqual(GEO);
    expect(later.cardDismissed('a')).toBe(true);
    expect([...settings.values.keys()].sort()).toEqual([
      'tapiro.boardLocationCard.a',
      'tapiro.boardPlace.a',
    ]);
  });

  test('the registered cleanup clears only that user', () => {
    const settings = memorySettings();
    const cleanups = createUserCleanups();
    const store = createOriginStore(settings, cleanups);
    store.setChosenPlace('a', GEO);
    store.dismissCard('a');
    store.setChosenPlace('b', GEO);
    cleanups.run('a');
    expect(store.chosenPlace('a')).toBeNull();
    expect(store.cardDismissed('a')).toBe(false);
    expect(store.chosenPlace('b')).toEqual(GEO);
  });

  test('clearing a place writes an empty string, and bad values read as none', () => {
    const settings = memorySettings();
    const store = createOriginStore(settings);
    store.setChosenPlace('a', GEO);
    store.setChosenPlace('a', null);
    expect(settings.values.get('tapiro.boardPlace.a')).toBe('');
    expect(store.chosenPlace('a')).toBeNull();
    for (const bad of ['{', 'null', '{"label":"x","point":{"latitude":91,"longitude":0}}', 7]) {
      settings.set({ 'tapiro.boardPlace.a': bad });
      expect(store.chosenPlace('a')).toBeNull();
    }
  });
});

describe('resolveOrigin (ruling 1)', () => {
  test('granted with a fix uses the viewer even with a chosen place', () => {
    expect(
      resolveOrigin({ permission: 'granted', point: HERE, chosen: GEO, dismissed: false }),
    ).toEqual({ kind: 'me', point: HERE });
  });

  test('without a usable fix the chosen place is used', () => {
    for (const permission of ['granted', 'denied', 'undetermined'] as const) {
      expect(resolveOrigin({ permission, point: null, chosen: GEO, dismissed: true })).toEqual({
        kind: 'place',
        point: GEO.point,
        label: GEO.label,
      });
    }
  });

  test('otherwise none, with the reason', () => {
    const none = (permission: 'granted' | 'denied' | 'undetermined', dismissed: boolean) =>
      resolveOrigin({ permission, point: null, chosen: null, dismissed });
    expect(none('undetermined', false)).toEqual({ kind: 'none', reason: 'undetermined' });
    expect(none('undetermined', true)).toEqual({ kind: 'none', reason: 'declined' });
    expect(none('denied', false)).toEqual({ kind: 'none', reason: 'denied' });
    expect(none('granted', false)).toEqual({ kind: 'none', reason: 'noFix' });
  });
});

describe('steadyOrigin', () => {
  const me = (latitude: number): BoardOrigin => ({
    kind: 'me',
    point: { latitude, longitude: 101.6078 },
  });

  test('a move under 100 m keeps the previous point', () => {
    const previous = me(3.0733);
    expect(steadyOrigin(previous, me(3.0733 + 50 / 111_195))).toBe(previous);
  });

  test('a move over 100 m or a different kind takes the new origin', () => {
    const previous = me(3.0733);
    const moved = me(3.0733 + 150 / 111_195);
    expect(steadyOrigin(previous, moved)).toBe(moved);
    const place: BoardOrigin = { kind: 'place', point: GEO.point, label: GEO.label };
    expect(steadyOrigin(previous, place)).toBe(place);
    expect(steadyOrigin(null, moved)).toBe(moved);
  });
});

describe('detailOrigin', () => {
  const me = (latitude: number): BoardOrigin => ({
    kind: 'me',
    point: { latitude, longitude: 101.6078 },
  });

  test('the detail measures from the point the board cards were measured from', async () => {
    const cleanups = createUserCleanups();
    const shown = createShownOrigins(cleanups);
    const board = me(3.0733);
    shown.set('u1', board);
    let evaluated = 0;
    const walked = async () => {
      evaluated += 1;
      return me(3.0733 + 80 / 111_195);
    };
    expect(await detailOrigin(shown.get('u1'), walked)).toBe(board);
    expect(evaluated).toBe(0);
    expect(await detailOrigin(shown.get('u2'), walked)).toEqual(me(3.0733 + 80 / 111_195));
    cleanups.run('u1');
    expect(shown.get('u1')).toBeNull();
  });
});

describe('evaluateOrigin', () => {
  const stored = { chosen: null, dismissed: false };

  test('a thrown permission check reads as undetermined, never as granted', async () => {
    let asked = false;
    const origin = await evaluateOrigin(
      {
        permission: () => Promise.reject(new Error('boom')),
        currentPoint: async () => {
          asked = true;
          return HERE;
        },
      },
      stored,
    );
    expect(origin).toEqual({ kind: 'none', reason: 'undetermined' });
    expect(asked).toBe(false);
  });

  test('asks for a fix only when granted; a thrown fix reads as no fix', async () => {
    const granted = async () => ({ status: 'granted' as const, reduced: false });
    expect(
      await evaluateOrigin({ permission: granted, currentPoint: async () => HERE }, stored),
    ).toEqual({
      kind: 'me',
      point: HERE,
    });
    expect(
      await evaluateOrigin(
        { permission: granted, currentPoint: () => Promise.reject(new Error('boom')) },
        stored,
      ),
    ).toEqual({ kind: 'none', reason: 'noFix' });
    let asked = false;
    await evaluateOrigin(
      {
        permission: async () => ({ status: 'denied', reduced: false }),
        currentPoint: async () => {
          asked = true;
          return HERE;
        },
      },
      stored,
    );
    expect(asked).toBe(false);
  });
});

describe('requestLocation', () => {
  test('a thrown request resolves as not granted instead of rejecting', async () => {
    const throwing = {
      request: async () => {
        throw new Error('unavailable');
      },
    };
    expect(await requestLocation(throwing)).toBe('undetermined');
  });

  test('passes the answer through', async () => {
    expect(
      await requestLocation({ request: async () => ({ status: 'denied', reduced: false }) }),
    ).toBe('denied');
  });
});
