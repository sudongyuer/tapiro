import { describe, expect, test } from 'bun:test';

import { cardFocusReducer, NO_FOCUS, type CardFocusEvent } from './cardFocusState';

const run = (...events: CardFocusEvent[]) => events.reduce(cardFocusReducer, NO_FOCUS);

describe('cardFocusReducer', () => {
  test('a tap rings its card once the scroll settles', () => {
    const state = run({ type: 'scrolling', id: 'a' }, { type: 'scrolled' }, { type: 'settled' });
    expect(state.ring).toEqual({ id: 'a', key: 1 });
    expect(state.pending).toBeNull();
  });

  test('a scroll that never moves (target equals the offset) still rings the card', () => {
    expect(run({ type: 'scrolling', id: 'a' }, { type: 'still' }).ring?.id).toBe('a');
  });

  test('a scroll already under way waits for the settle, not the stillness check', () => {
    const state = run({ type: 'scrolling', id: 'a' }, { type: 'scrolled' }, { type: 'still' });
    expect(state.ring).toBeNull();
    expect(state.pending).toBe('a');
  });

  test('without a tap, a settle or a stillness check rings nothing', () => {
    expect(run({ type: 'settled' }, { type: 'still' }).ring).toBeNull();
  });

  test('a drag cancels the pending ring', () => {
    expect(
      run({ type: 'scrolling', id: 'a' }, { type: 'dragged' }, { type: 'settled' }).ring,
    ).toBeNull();
  });

  test('a card that unmounts mid-ring does not ring again when it comes back', () => {
    const state = run(
      { type: 'scrolling', id: 'a' },
      { type: 'settled' },
      { type: 'gone', id: 'a' },
    );
    expect(state.ring).toBeNull();
    expect(cardFocusReducer(state, { type: 'settled' }).ring).toBeNull();
  });

  test('a card that unmounts before the settle drops the pending ring', () => {
    const state = run(
      { type: 'scrolling', id: 'a' },
      { type: 'gone', id: 'a' },
      { type: 'settled' },
    );
    expect(state.ring).toBeNull();
  });

  test('another card unmounting keeps the ring', () => {
    const state = run({ type: 'show', id: 'a' }, { type: 'gone', id: 'b' });
    expect(state.ring?.id).toBe('a');
  });

  test('a filter, origin or rows change clears the ring and the pending tap', () => {
    const ringing = run({ type: 'show', id: 'a' }, { type: 'reset' });
    expect(ringing.ring).toBeNull();
    const waiting = run({ type: 'scrolling', id: 'b' }, { type: 'reset' }, { type: 'settled' });
    expect(waiting.ring).toBeNull();
  });

  test('only the current ring is cleared by its completion; a new tap gets a new key', () => {
    const first = run({ type: 'show', id: 'a' });
    const second = cardFocusReducer(first, { type: 'show', id: 'b' });
    expect(second.ring).toEqual({ id: 'b', key: 2 });
    expect(cardFocusReducer(second, { type: 'done', key: 1 }).ring?.id).toBe('b');
    expect(cardFocusReducer(second, { type: 'done', key: 2 }).ring).toBeNull();
  });
});
