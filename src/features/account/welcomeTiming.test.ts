import { describe, expect, test } from 'bun:test';

import { DRIFT_CYCLES, loopEndMs, POP_DURATION } from './welcomeTiming';
import { welcomeLayout } from './welcomeLayout';

describe('loopEndMs', () => {
  test('starts after the pop and runs whole cycles', () => {
    expect(loopEndMs(70, 6400, 2)).toBe(70 + POP_DURATION + 12800);
  });

  test('every sticker drift ends within 17 s', () => {
    const { stickers } = welcomeLayout({ width: 402, height: 874, panelHeight: 311, topInset: 62 });
    const ends = stickers.map((s) => loopEndMs(s.delay, s.drift.period, DRIFT_CYCLES));
    expect(Math.max(...ends)).toBeLessThan(17000);
  });
});
