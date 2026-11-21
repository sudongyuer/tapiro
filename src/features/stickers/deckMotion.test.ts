import { describe, expect, test } from 'bun:test';

import { cardPose, cardWindow, dragPosition, releaseTurn, rubberBand } from './deckMotion';

const WIDTH = 400;

describe('release', () => {
  test('a release past 30 % of the width turns: left to the older card, right to the newer', () => {
    expect(releaseTurn(-130, 0, WIDTH, 5, 2)).toBe(1);
    expect(releaseTurn(130, 0, WIDTH, 5, 2)).toBe(-1);
  });

  test('a short drag springs back unless it is flung faster than 800 pt/s the same way', () => {
    expect(releaseTurn(-100, -300, WIDTH, 5, 2)).toBe(0);
    expect(releaseTurn(-40, -900, WIDTH, 5, 2)).toBe(1);
    expect(releaseTurn(40, 900, WIDTH, 5, 2)).toBe(-1);
    expect(releaseTurn(-40, 900, WIDTH, 5, 2)).toBe(0);
  });

  test('the newest card cannot turn newer and the oldest cannot turn older', () => {
    expect(releaseTurn(300, 2000, WIDTH, 5, 0)).toBe(0);
    expect(releaseTurn(-300, -2000, WIDTH, 5, 4)).toBe(0);
    expect(releaseTurn(-300, 0, WIDTH, 1, 0)).toBe(0);
  });
});

describe('drag', () => {
  test('inside the deck the card follows the finger one for one', () => {
    expect(dragPosition(2, -100, WIDTH, 5)).toBeCloseTo(2.25);
    expect(dragPosition(2, 100, WIDTH, 5)).toBeCloseTo(1.75);
  });

  test('past either end the drag meets resistance and never reaches the 30 % turn line', () => {
    const pulled = dragPosition(0, 1000, WIDTH, 5);
    expect(pulled).toBeLessThan(0);
    expect(0 - pulled).toBeLessThan(0.3);
    expect(Math.abs(rubberBand(1000, WIDTH))).toBeLessThan(WIDTH * 0.3);
    expect(Math.abs(rubberBand(50, WIDTH))).toBeLessThan(50);
    expect(dragPosition(4, -1000, WIDTH, 5)).toBeGreaterThan(4);
  });
});

describe('poses', () => {
  test('at rest the top card is upright and the next two older cards fan out behind it', () => {
    const top = cardPose(2, 2, 2, WIDTH);
    expect(top).toMatchObject({ translateX: 0, rotate: 0, scale: 1, opacity: 1 });
    const behind = cardPose(3, 2, 2, WIDTH);
    expect(behind.rotate).not.toBe(0);
    expect(behind.scale).toBeLessThan(1);
    expect(cardPose(4, 2, 2, WIDTH).opacity).toBe(1);
    expect(cardPose(5, 2, 2, WIDTH).opacity).toBe(0);
    expect(cardPose(1, 2, 2, WIDTH).translateX).toBeLessThanOrEqual(-WIDTH);
  });

  test('dragging left tilts the top card with the finger and raises the older card one layer', () => {
    const position = dragPosition(2, -200, WIDTH, 5);
    const top = cardPose(2, position, 2, WIDTH);
    expect(top.translateX).toBeCloseTo(-200);
    expect(top.rotate).toBeCloseTo(-5);
    const rising = cardPose(3, position, 2, WIDTH);
    const resting = cardPose(3, 2, 2, WIDTH);
    expect(rising.scale).toBeGreaterThan(resting.scale);
    expect(cardPose(3, 3, 2, WIDTH)).toMatchObject({ translateX: 0, rotate: 0, scale: 1 });
  });

  test('dragging right sends the top card right and brings the newer card up from the stack', () => {
    const position = dragPosition(2, 200, WIDTH, 5);
    expect(cardPose(2, position, 2, WIDTH).translateX).toBeCloseTo(200);
    const rising = cardPose(1, position, 2, WIDTH);
    expect(rising.translateX).toBeGreaterThan(-WIDTH);
    expect(rising.scale).toBeLessThan(1);
    expect(cardPose(1, 1, 2, WIDTH)).toMatchObject({ translateX: 0, rotate: 0, scale: 1 });
    expect(cardPose(3, position, 2, WIDTH).translateX).toBeGreaterThan(WIDTH / 2);
  });
});

test('the card coming up from the stack is always drawn under the top card', () => {
  expect(cardWindow(0, 2, false)).toEqual([1, 0]);
  const older = cardWindow(4, 10, false);
  expect(older.at(-1)).toBe(1);
  expect(older.indexOf(4)).toBeGreaterThan(older.indexOf(5));
  const newer = cardWindow(4, 10, true);
  expect(newer.indexOf(4)).toBeGreaterThan(newer.indexOf(3));
});
