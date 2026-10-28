import { describe, expect, test } from 'bun:test';

import { NOTE_MAX, noteCount } from './applyState';
import { seededNote, WORST_NOTE } from './fixtureNotes';

describe('seeded apply notes', () => {
  test('worst is a full note with spaces between words', () => {
    expect(seededNote('worst')).toBe(WORST_NOTE);
    expect(noteCount(WORST_NOTE)).toBe(NOTE_MAX);
    expect(WORST_NOTE).toContain(' ');
  });

  test('any other value is the note itself, and no value is empty', () => {
    expect(seededNote('好👍🏽')).toBe('好👍🏽');
    expect(seededNote(undefined)).toBe('');
  });
});
