import { describe, expect, test } from 'bun:test';

import { createSafetyNotes } from './safetyNotes';

function memorySettings() {
  const values = new Map<string, unknown>();
  return {
    values,
    get: (key: string) => values.get(key),
    set: (next: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(next)) values.set(key, value);
    },
  };
}

describe('the chat safety note', () => {
  test('shows in every thread until the user hides it there', () => {
    const notes = createSafetyNotes(memorySettings());
    expect(notes.hidden('u1', 't1')).toBe(false);
    notes.hide('u1', 't1');
    expect(notes.hidden('u1', 't1')).toBe(true);
    expect(notes.hidden('u1', 't2')).toBe(false);
    expect(notes.hidden('u2', 't1')).toBe(false);
  });

  test('stays hidden after a restart and returns after the account is cleared', () => {
    const settings = memorySettings();
    createSafetyNotes(settings).hide('u1', 't1');
    const restarted = createSafetyNotes(settings);
    expect(restarted.hidden('u1', 't1')).toBe(true);
    restarted.clear('u1');
    expect(createSafetyNotes(settings).hidden('u1', 't1')).toBe(false);
  });

  test('a hide tells subscribers once', () => {
    const notes = createSafetyNotes(memorySettings());
    let calls = 0;
    notes.subscribe(() => {
      calls += 1;
    });
    notes.hide('u1', 't1');
    notes.hide('u1', 't1');
    expect(calls).toBe(1);
  });

  test('an unreadable stored value shows the note', () => {
    const settings = memorySettings();
    settings.set({ 'tapiro.chatSafetyHidden.u1': '{oops' });
    expect(createSafetyNotes(settings).hidden('u1', 't1')).toBe(false);
  });
});
