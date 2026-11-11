import { expect, test } from 'bun:test';

import { FLIGHT_END, LEAF_LIFT, leafAt, segmentLevel } from './feedMotion';

const FROM = { x: 100, y: 300 };
const TO = { x: 160, y: 40 };

test('the leaf starts on the button and lands at the mouth, then is gone', () => {
  expect(leafAt(0, FROM, TO)).toEqual({ ...FROM, scale: 1, opacity: 1 });
  const landed = leafAt(FLIGHT_END, FROM, TO);
  expect(landed.x).toBeCloseTo(TO.x);
  expect(landed.y).toBeCloseTo(TO.y);
  expect(landed.opacity).toBe(0);
  expect(leafAt(1, FROM, TO).opacity).toBe(0);
});

test('the leaf arcs above the straight line on the way', () => {
  const middle = leafAt(FLIGHT_END / 2, FROM, TO);
  expect(middle.y).toBeCloseTo((FROM.y + TO.y) / 2 - LEAF_LIFT);
});

test('segments stay empty during the flight, then fill one after another', () => {
  for (let index = 0; index < 5; index += 1) expect(segmentLevel(FLIGHT_END, index)).toBe(0);
  expect(segmentLevel(0.6, 0)).toBe(1);
  expect(segmentLevel(0.6, 1)).toBe(0);
  expect(segmentLevel(0.75, 2)).toBeGreaterThan(0);
  expect(segmentLevel(0.75, 2)).toBeLessThan(1);
  for (let index = 0; index < 5; index += 1) expect(segmentLevel(1, index)).toBe(1);
});
