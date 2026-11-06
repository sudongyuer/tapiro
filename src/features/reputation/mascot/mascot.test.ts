import { describe, expect, test } from 'bun:test';

import { fixtureMascot } from '../fixtureData';
import { createGrowMarks } from './growMarks';
import { GROW_CROUCH, GROW_FROM, growScale } from './growTimeline';
import { grownMoment, newAccessories } from './grownView';

function memorySettings() {
  const values: Record<string, unknown> = {};
  return {
    get: (key: string) => values[key],
    set: (next: Record<string, unknown>) => Object.assign(values, next),
  };
}

describe('grow marks', () => {
  test('a level played on this device stays played for that user only', () => {
    const marks = createGrowMarks(memorySettings(), (id) => `played.${id}`);
    expect(marks.played('a')).toBe(0);
    marks.mark('a', 5);
    expect(marks.played('a')).toBe(5);
    expect(marks.played('b')).toBe(0);
    marks.clear('a');
    expect(marks.played('a')).toBe(0);
  });

  test('a stored value that is not a number reads as nothing played', () => {
    const settings = memorySettings();
    settings.set({ 'played.a': 'oops' });
    expect(createGrowMarks(settings, (id) => `played.${id}`).played('a')).toBe(0);
  });
});

describe('grow scale', () => {
  test('starts at the old size, crouches, then rests at full size', () => {
    expect(growScale(0, 0, GROW_CROUCH.y)).toBeCloseTo(GROW_FROM);
    expect(growScale(1, 0, GROW_CROUCH.y)).toBeCloseTo(GROW_CROUCH.y);
    expect(growScale(1, 0, GROW_CROUCH.x)).toBeCloseTo(GROW_CROUCH.x);
    expect(growScale(1, 1, GROW_CROUCH.y)).toBeCloseTo(1);
    expect(growScale(1, 1, GROW_CROUCH.x)).toBeCloseTo(1);
  });
});

describe('the grown moment', () => {
  test('lists only what this level-up unlocked', () => {
    expect(newAccessories(grownMoment(fixtureMascot('levelUp')))).toEqual(['scarf']);
  });

  test('a jump of two levels lists both accessories', () => {
    expect(newAccessories(grownMoment(fixtureMascot('jump')))).toEqual(['red_hat', 'backpack']);
  });

  test('from Lv.6 nothing new is listed', () => {
    expect(newAccessories(grownMoment(fixtureMascot('grown')))).toEqual([]);
  });
});
