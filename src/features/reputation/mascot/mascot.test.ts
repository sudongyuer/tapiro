import { describe, expect, test } from 'bun:test';

import { fixtureMascot } from '../fixtureData';
import { createGrowMarks } from './growMarks';
import { GROW_CROUCH, growScale, growStep } from './growTimeline';
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
  test('starts at the size on screen, crouches, then rests at full size', () => {
    expect(growScale(0, 0, GROW_CROUCH.y)).toBeCloseTo(1);
    expect(growScale(1, 0, GROW_CROUCH.y)).toBeCloseTo(GROW_CROUCH.y);
    expect(growScale(1, 0, GROW_CROUCH.x)).toBeCloseTo(GROW_CROUCH.x);
    expect(growScale(1, 1, GROW_CROUCH.y)).toBeCloseTo(1);
    expect(growScale(1, 1, GROW_CROUCH.x)).toBeCloseTo(1);
  });
});

describe('grow step', () => {
  const up = { levelUp: true, level: 5, played: 4 };

  test('plays once when the stage is visible', () => {
    expect(growStep({ ...up, visible: true })).toBe('play');
    expect(growStep({ ...up, played: 5, visible: true })).toBe('finish');
  });

  test('waits for a stage that is collapsed or off screen', () => {
    expect(growStep({ ...up, visible: false })).toBe('hold');
  });

  test('a stage scrolled away mid-way goes to the end', () => {
    expect(growStep({ ...up, played: 5, visible: false })).toBe('finish');
  });

  test('a level already seen never plays, even if not played here', () => {
    expect(growStep({ levelUp: false, level: 5, played: 0, visible: true })).toBe('finish');
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
