import { describe, expect, test } from 'bun:test';

import { checkMemoryDraft, parseMemoryOutcome, toMemoryFailure } from './memory';

describe('小貘记得 on the phone', () => {
  test('a reply names at most three entries and drops what it cannot read', () => {
    const use = (id: string) => ({ id, kind: 'place', label: '宿舍', content: 'Sunway Geo' });
    expect(
      parseMemoryOutcome({
        used: [
          use('a'),
          { id: 'b', kind: 'habit', label: 'x', content: 'y' },
          use('c'),
          use('d'),
          use('e'),
        ],
        offer: null,
      })?.used.map((each) => each.id),
    ).toEqual(['a', 'c']);
  });

  test('an offer needs a known kind, a label and a value within the limits', () => {
    expect(
      parseMemoryOutcome({ used: [], offer: { kind: 'place', label: ' 学校 ', content: 'SU' } }),
    ).toEqual({
      used: [],
      offer: { kind: 'place', label: '学校', content: 'SU' },
    });
    expect(
      parseMemoryOutcome({
        used: [],
        offer: { kind: 'place', label: 'x'.repeat(41), content: 'y' },
      }),
    ).toBeNull();
    expect(parseMemoryOutcome({ used: [], offer: null })).toBeNull();
    expect(parseMemoryOutcome(undefined)).toBeNull();
  });

  test('a draft entry is trimmed and must have both parts', () => {
    expect(
      checkMemoryDraft({ id: null, kind: 'place', label: ' 宿舍 ', content: ' Geo ' }),
    ).toEqual({
      id: null,
      kind: 'place',
      label: '宿舍',
      content: 'Geo',
    });
    expect(checkMemoryDraft({ id: null, kind: 'place', label: '宿舍', content: '   ' })).toBeNull();
  });

  test.each([
    ['memory_off', 'off'],
    ['memory_full', 'full'],
    ['label_taken', 'labelTaken'],
    ['memory_not_found', 'notFound'],
    ['invalid_memory', 'invalid'],
    ['something else', 'failed'],
  ])('the server refusal %s reads as %s', (message, failure) => {
    expect(toMemoryFailure({ message }) as string).toBe(failure);
  });
});
