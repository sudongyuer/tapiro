import { describe, expect, test } from 'bun:test';

import {
  backOffset,
  followShift,
  holdStack,
  MAX_STACKED,
  PEEK,
  STACK_GAP,
  stackHeight,
  stackLayout,
} from './stackLayout';

describe('stackLayout', () => {
  test('one card sits alone at its own height', () => {
    const layout = stackLayout([300]);
    expect(layout.stacked).toEqual([{ y: 0, scale: 1, visible: true }]);
    expect(layout.stackedHeight).toBe(300);
    expect(layout.fannedHeight).toBe(300);
  });

  test('a shorter card behind peeks out below the front card', () => {
    const layout = stackLayout([312, 206]);
    expect(layout.stacked[1].y + 206).toBe(312 + PEEK);
    expect(layout.stacked[1].scale).toBeLessThan(1);
    expect(layout.stackedHeight).toBe(312 + PEEK);
  });

  test('a taller card behind never rises above the front card', () => {
    const layout = stackLayout([200, 320]);
    expect(layout.stacked[1].y).toBe(0);
    expect(layout.stackedHeight).toBe(320);
  });

  test('fanned cards keep their own heights with a gap between them', () => {
    const layout = stackLayout([312, 292, 206]);
    expect(layout.fanned.map((placement) => placement.y)).toEqual([
      0,
      312 + STACK_GAP,
      312 + 292 + 2 * STACK_GAP,
    ]);
    expect(layout.fannedHeight).toBe(312 + 292 + 206 + 2 * STACK_GAP);
  });

  test(`only ${MAX_STACKED} cards show while stacked`, () => {
    const layout = stackLayout([300, 280, 260, 240]);
    expect(layout.stacked.map((placement) => placement.visible)).toEqual([true, true, true, false]);
    expect(layout.stackedHeight).toBe(300 + 2 * PEEK);
    expect(layout.fanned.every((placement) => placement.visible)).toBe(true);
  });
});

describe('stack container', () => {
  const layout = stackLayout([312, 206]);
  const extra = layout.fannedHeight - layout.stackedHeight;

  test('reports the fanned bottom while open so the accessory waits for the last card', () => {
    expect(stackHeight(layout, false)).toBe(312 + PEEK);
    expect(stackHeight(layout, true)).toBe(312 + 206 + STACK_GAP);
  });

  test('content below starts where it was and ends at the new layout', () => {
    expect(followShift(0, extra, true)).toBe(-extra);
    expect(followShift(1, extra, true)).toBe(0);
    expect(followShift(1, extra, false)).toBe(extra);
    expect(followShift(0, extra, false)).toBe(0);
  });
});

describe('holdStack', () => {
  const settled = { height: 206, open: false, shift: 0 };

  test('a closed stack that grows starts the content below where it was', () => {
    expect(holdStack(settled, 312, true, false, true)).toEqual({
      height: 312,
      open: false,
      shift: 206 - 312,
    });
  });

  test('keeps the last measured height while a new card measures', () => {
    expect(holdStack(settled, 0, false, false, true)).toBe(settled);
  });

  test('jumps with Reduce Motion, while open, when opening and on the first measure', () => {
    expect(holdStack(settled, 312, true, false, false).shift).toBe(0);
    expect(holdStack({ ...settled, open: true }, 312, true, true, true).shift).toBe(0);
    expect(holdStack(settled, 530, true, true, true).shift).toBe(0);
    expect(holdStack({ height: 0, open: false, shift: 0 }, 312, true, false, true).shift).toBe(0);
  });

  test('an unchanged stack keeps its state', () => {
    expect(holdStack(settled, 206, true, false, true)).toBe(settled);
  });
});

describe('backOffset', () => {
  test('a shorter or equal card behind sits one peek lower', () => {
    expect(backOffset(206, 206)).toBe(PEEK);
    expect(backOffset(312, 206)).toBe(312 + PEEK - 206);
  });

  test('a taller card behind keeps its bottom at its own height when it already shows below', () => {
    expect(backOffset(206, 312)).toBe(0);
    expect(backOffset(206, 230)).toBe(206 + PEEK - 230);
  });

  test('falls back to one peek before both cards are measured', () => {
    expect(backOffset(0, 312)).toBe(PEEK);
    expect(backOffset(206, 0)).toBe(PEEK);
  });
});
