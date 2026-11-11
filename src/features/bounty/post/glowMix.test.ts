import { describe, expect, test } from 'bun:test';

import { glowMix } from './glowMix';

describe('the fill glow', () => {
  test('holds 600 ms, then fades out over 600 ms, ease-out', () => {
    expect(glowMix(-200, false)).toBe(1);
    expect(glowMix(599, false)).toBe(1);
    const fading = [700, 800, 900, 1000, 1100].map((at) => glowMix(at, false));
    expect(fading.every((mix) => mix > 0 && mix < 1)).toBe(true);
    expect([...fading].sort((a, b) => b - a)).toEqual(fading);
    expect(glowMix(700, false)).toBeLessThan(1 - 100 / 600);
    expect(glowMix(1200, false)).toBe(0);
  });

  test('under Reduce Motion stays lit 1.2 s and goes out at once', () => {
    expect(glowMix(1199, true)).toBe(1);
    expect(glowMix(1200, true)).toBe(0);
  });
});
