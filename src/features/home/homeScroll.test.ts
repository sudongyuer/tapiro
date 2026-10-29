import { describe, expect, test } from 'bun:test';

import { createRestingOffset, createTopRequest, liveCardsOnScreen } from './homeScroll';

const HEADER = 158;
const RESTING = -HEADER;

describe('liveCardsOnScreen', () => {
  test('on screen at rest under an expanded large title', () => {
    expect(
      liveCardsOnScreen({ offsetY: RESTING, headerHeight: HEADER, liveCardsBottom: 200 }),
    ).toBe(true);
  });

  test('still on screen while the bottom edge is below the bar', () => {
    expect(liveCardsOnScreen({ offsetY: 100, headerHeight: 98, liveCardsBottom: 200 })).toBe(true);
  });

  test('gone once the bottom edge reaches the bar', () => {
    expect(liveCardsOnScreen({ offsetY: 102, headerHeight: 98, liveCardsBottom: 200 })).toBe(false);
  });
});

describe('createRestingOffset', () => {
  test('unknown until the first drag', () => {
    expect(createRestingOffset().get()).toBeNull();
  });

  test('keeps the offset where the first drag started', () => {
    const resting = createRestingOffset();
    resting.recordDragStart(RESTING);
    resting.recordDragStart(340);
    expect(resting.get()).toBe(RESTING);
  });
});

describe('createTopRequest', () => {
  test('a request on the shown board scrolls at once and leaves nothing pending', () => {
    const top = createTopRequest();
    expect(top.request(true)).toBe(true);
    expect(top.shown(false)).toBe(false);
  });

  test('a request from a pushed screen scrolls once, when the board has appeared', () => {
    const top = createTopRequest();
    expect(top.request(false)).toBe(false);
    expect(top.shown(true)).toBe(false);
    expect(top.shown(false)).toBe(true);
    expect(top.shown(false)).toBe(false);
  });

  test('a return that never finished does not scroll a later return', () => {
    const top = createTopRequest();
    top.request(false);
    top.left();
    expect(top.shown(false)).toBe(false);
  });
});
