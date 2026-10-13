import { describe, expect, test } from 'bun:test';

import { MAX_STACKED, PEEK, STACK_GAP, stackLayout } from './stackLayout';

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
