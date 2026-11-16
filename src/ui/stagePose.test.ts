import { describe, expect, test } from 'bun:test';

import {
  BUBBLE_LEFT,
  BUBBLE_SLOT,
  BUBBLE_TAIL,
  bubbleMaxWidth,
  CAR_OVERHANG,
  POSE,
  STAGE_HEIGHT,
  type StageState,
} from './stagePose';

const STATES: StageState[] = ['urgent', 'live', 'calm'];
const WIDTHS = [375, 393, 402, 440];

describe('stage bubble', () => {
  test('on a 402 pt stage the bubble is 200 pt wide beside the car and 216 pt beside 小貘 alone', () => {
    expect(bubbleMaxWidth('live', 402)).toBe(200);
    expect(bubbleMaxWidth('urgent', 402)).toBe(216);
    expect(bubbleMaxWidth('calm', 402)).toBe(216);
  });

  test('the bubble and its tail end at least 8 pt before the car or 小貘 at every phone width', () => {
    for (const state of STATES) {
      for (const width of WIDTHS) {
        const tailEnd = BUBBLE_LEFT + bubbleMaxWidth(state, width) + BUBBLE_TAIL;
        const actorLeft =
          width - POSE[state].right - POSE[state].size - (state === 'live' ? CAR_OVERHANG : 0);
        expect(actorLeft - tailEnd).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test('a bubble of up to three lines starts 18 pt under the stage top', () => {
    expect(STAGE_HEIGHT - BUBBLE_SLOT.bottom - BUBBLE_SLOT.minHeight).toBe(18);
  });
});
