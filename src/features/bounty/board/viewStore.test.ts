import { describe, expect, test } from 'bun:test';

import { createUserCleanups } from '@/lib/userCleanups';

import type { SettingsLike } from './originStore';
import { createViewStore, seedBoardView } from './viewStore';

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

describe('viewStore', () => {
  test('defaults to the list, and unknown stored values read as the list', () => {
    const settings = memorySettings();
    const store = createViewStore(settings);
    expect(store.boardView('a')).toBe('list');
    for (const bad of ['', 'grid', 'MAP', 1, null]) {
      settings.set({ 'tapiro.boardView.a': bad });
      expect(store.boardView('a')).toBe('list');
    }
  });

  test('keeps the view per user, across store instances', () => {
    const settings = memorySettings();
    createViewStore(settings).setBoardView('a', 'map');
    const later = createViewStore(settings);
    expect(later.boardView('a')).toBe('map');
    expect(later.boardView('b')).toBe('list');
    later.setBoardView('a', 'list');
    expect(later.boardView('a')).toBe('list');
    expect(settings.values.get('tapiro.boardView.a')).toBe('list');
  });

  test('the hint is marked once and stays shown', () => {
    const settings = memorySettings();
    const store = createViewStore(settings);
    expect(store.hintShown('a')).toBe(false);
    store.markHintShown('a');
    expect(createViewStore(settings).hintShown('a')).toBe(true);
    expect(store.hintShown('b')).toBe(false);
    expect(settings.values.get('tapiro.boardViewHint.a')).toBe('1');
  });

  test('sign-out cleanup clears only that user, with empty strings', () => {
    const settings = memorySettings();
    const cleanups = createUserCleanups();
    const store = createViewStore(settings, cleanups);
    store.setBoardView('a', 'map');
    store.markHintShown('a');
    store.setBoardView('b', 'map');
    cleanups.run('a');
    expect(store.boardView('a')).toBe('list');
    expect(store.hintShown('a')).toBe(false);
    expect(settings.values.get('tapiro.boardView.a')).toBe('');
    expect(settings.values.get('tapiro.boardViewHint.a')).toBe('');
    expect(store.boardView('b')).toBe('map');
  });
});

describe('seedBoardView', () => {
  test('a seeded view replaces the stored one and resets the hint', () => {
    const store = createViewStore(memorySettings());
    store.markHintShown('a');
    seedBoardView(store, 'a', 'map');
    expect(store.boardView('a')).toBe('map');
    expect(store.hintShown('a')).toBe(false);
    seedBoardView(store, 'a', 'list');
    expect(store.boardView('a')).toBe('list');
  });

  test('only keep leaves what is stored', () => {
    const store = createViewStore(memorySettings());
    store.setBoardView('a', 'map');
    store.markHintShown('a');
    seedBoardView(store, 'a', 'keep');
    expect(store.boardView('a')).toBe('map');
    expect(store.hintShown('a')).toBe(true);
  });

  test('omitted or unknown arguments seed the list, so a stored map never leaks into the next run', () => {
    for (const seeded of [undefined, '', 'grid']) {
      const store = createViewStore(memorySettings());
      store.setBoardView('a', 'map');
      store.markHintShown('a');
      seedBoardView(store, 'a', seeded);
      expect(store.boardView('a')).toBe('list');
      expect(store.hintShown('a')).toBe(false);
    }
  });
});
