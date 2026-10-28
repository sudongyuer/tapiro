import { describe, expect, test } from 'bun:test';

import { createJustApplied } from './justApplied';

describe('justApplied', () => {
  test('waits for the sheet to be gone, then plays once on the surface that opened it', () => {
    const just = createJustApplied();
    just.set('b1', 'detail');
    expect(just.has('b1', 'detail')).toBe(true);
    expect(just.ready('b1', 'detail')).toBe(false);
    expect(just.take('b1', 'detail')).toBe(false);
    just.sheetGone();
    expect(just.ready('b1', 'card')).toBe(false);
    expect(just.take('b1', 'card')).toBe(false);
    expect(just.take('b1', 'detail')).toBe(true);
    expect(just.take('b1', 'detail')).toBe(false);
  });

  test('release frees only this entry when the finish event never arrives', () => {
    const just = createJustApplied();
    just.set('b1', 'card');
    just.set('b2', 'detail');
    expect(just.entry('b1', 'card')).toBe('waiting');
    just.release('b1', 'detail');
    expect(just.entry('b1', 'card')).toBe('waiting');
    just.release('b1', 'card');
    expect(just.entry('b1', 'card')).toBe('ready');
    expect(just.entry('b2', 'detail')).toBe('waiting');
    expect(just.entry('b1', 'detail')).toBe('none');
    expect(just.take('b1', 'card')).toBe(true);
    expect(just.entry('b1', 'card')).toBe('none');
  });

  test('drop clears an entry whose surface closed', () => {
    const just = createJustApplied();
    let changes = 0;
    just.subscribe(() => {
      changes += 1;
    });
    just.set('b1', 'detail');
    just.drop('b1');
    expect(just.has('b1', 'detail')).toBe(false);
    just.sheetGone();
    expect(changes).toBe(2);
  });
});
