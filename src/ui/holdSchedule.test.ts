import { describe, expect, test } from 'bun:test';

import {
  HOLD_FILL_MS,
  HOLD_PRESS_IMPACT,
  holdCrossing,
  holdFillMs,
  holdRunBackMs,
  type HoldImpact,
} from './holdSchedule';

function run(frames: number[]) {
  const impacts: HoldImpact[] = [];
  let completes = 0;
  for (let i = 1; i < frames.length; i++) {
    const crossing = holdCrossing(frames[i - 1], frames[i]);
    impacts.push(...crossing.impacts);
    if (crossing.complete) completes++;
  }
  return { impacts, completes };
}

function linearHold(untilMs: number, frameMs = 16) {
  const frames: number[] = [];
  for (let t = 0; t <= untilMs; t += frameMs) frames.push(Math.min(1, t / HOLD_FILL_MS));
  frames.push(Math.min(1, untilMs / HOLD_FILL_MS));
  return frames;
}

describe('fill', () => {
  test('takes one second from empty, and only the remaining time from a partial fill', () => {
    expect(HOLD_FILL_MS).toBe(1000);
    expect(holdFillMs(0)).toBe(1000);
    expect(holdFillMs(0.4)).toBeCloseTo(600);
    expect(holdFillMs(1)).toBe(0);
  });
});

describe('haptics', () => {
  test('a press starts with a light tick', () => {
    expect(HOLD_PRESS_IMPACT).toBe('light');
  });

  test('ticks at 250, 500 and 750 ms ramp light, medium, medium, then heavy at full', () => {
    const at = (ms: number) => holdCrossing((ms - 1) / HOLD_FILL_MS, ms / HOLD_FILL_MS).impacts;
    expect(at(250)).toEqual(['light']);
    expect(at(500)).toEqual(['medium']);
    expect(at(750)).toEqual(['medium']);
    expect(at(1000)).toEqual(['heavy']);
    expect(at(400)).toEqual([]);
  });

  test('a full hold fires each tick once, in order', () => {
    expect(run(linearHold(1400)).impacts).toEqual(['light', 'medium', 'medium', 'heavy']);
  });

  test('running back fires nothing', () => {
    expect(run([0.8, 0.6, 0.3, 0]).impacts).toEqual([]);
  });
});

describe('complete', () => {
  test('a release at any time before full never completes', () => {
    for (let ms = 0; ms < HOLD_FILL_MS; ms += 50) {
      const held = linearHold(ms);
      const released = [...held, held.at(-1)! / 2, 0];
      expect(run(released).completes).toBe(0);
    }
    expect(run(linearHold(999)).completes).toBe(0);
  });

  test('fires once when the fill reaches full, even if the finger stays down', () => {
    expect(run([...linearHold(1000), 1, 1, 1]).completes).toBe(1);
  });

  test('a fill that resumes after a partial run-back still completes once', () => {
    expect(run([0, 0.4, 0.2, 0.6, 1, 1]).completes).toBe(1);
  });
});

describe('run back', () => {
  test('takes 200 ms, and jumps to empty under Reduce Motion', () => {
    expect(holdRunBackMs(false)).toBe(200);
    expect(holdRunBackMs(true)).toBe(0);
  });
});
