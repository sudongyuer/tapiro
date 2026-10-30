import { expect, test } from 'bun:test';

import { createBookViewStore } from './bookViewStore';

test('the book remembers the last view per user and forgets it on sign-out', () => {
  const values: Record<string, unknown> = {};
  const settings = {
    get: (key: string) => values[key],
    set: (next: Record<string, unknown>) => Object.assign(values, next),
  };
  const cleanups: ((userId: string) => void)[] = [];
  const store = createBookViewStore(settings, {
    register: (fn: (userId: string) => void) => cleanups.push(fn),
  } as never);
  expect(store.view('u1')).toBe('stack');
  store.setView('u1', 'calendar');
  expect(store.view('u1')).toBe('calendar');
  expect(store.view('u2')).toBe('stack');
  for (const cleanup of cleanups) cleanup('u1');
  expect(store.view('u1')).toBe('stack');
});
