import { describe, expect, test } from 'bun:test';

import {
  HOLD_FILL_MS,
  HOLD_IDLE,
  HOLD_PRESS_IMPACT,
  holdCrossing,
  holdFillMs,
  holdFrame,
  holdPress,
  holdRelease,
  holdRunBackMs,
  type HoldImpact,
  type HoldTrack,
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

type Step = { press: true } | { release: true } | { frame: number };

function session(steps: Step[], start: HoldTrack = HOLD_IDLE) {
  let track = start;
  let completes = 0;
  const starts: number[] = [];
  for (const step of steps) {
    if ('press' in step) {
      const pressed = holdPress(track);
      track = pressed.track;
      starts.push(pressed.from);
    } else if ('release' in step) {
      track = holdRelease(track);
    } else {
      const framed = holdFrame(track, step.frame);
      track = framed.track;
      if (framed.complete) completes++;
    }
  }
  return { completes, starts, track };
}

const frames = (...values: number[]): Step[] => values.map((frame) => ({ frame }));

describe('complete', () => {
  test('a release at any time before full never completes, even if a late frame reaches full', () => {
    for (let ms = 0; ms < HOLD_FILL_MS; ms += 50) {
      const reached = ms / HOLD_FILL_MS;
      const steps: Step[] = [{ press: true }, ...frames(reached / 2, reached), { release: true }];
      expect(session([...steps, ...frames(1, 0.5, 0)]).completes).toBe(0);
    }
  });

  test('fires once when the fill reaches full, even if the finger stays down', () => {
    expect(session([{ press: true }, ...frames(0.5, 1, 1, 1)]).completes).toBe(1);
  });

  test('a fill that resumes after a partial run-back still completes once', () => {
    const steps: Step[] = [
      { press: true },
      ...frames(0.4),
      { release: true },
      ...frames(0.2),
      { press: true },
      ...frames(0.6, 1),
    ];
    const result = session(steps);
    expect(result.starts).toEqual([0, 0.2]);
    expect(result.completes).toBe(1);
  });

  test('after a completed hold, a re-press during the run-back starts from empty', () => {
    const steps: Step[] = [
      { press: true },
      ...frames(1),
      { release: true },
      ...frames(0.8),
      { press: true },
      ...frames(0.1, 0.2),
      { release: true },
    ];
    const result = session(steps);
    expect(result.starts).toEqual([0, 0]);
    expect(result.completes).toBe(1);
  });

  test('after a completed hold, a quick re-press cannot complete again from the run-back', () => {
    const steps: Step[] = [
      { press: true },
      ...frames(1),
      { release: true },
      ...frames(0.95),
      { press: true },
      ...frames(0.05),
      { release: true },
    ];
    expect(session(steps).completes).toBe(1);
  });

  test('a second full hold after a completed one completes again', () => {
    const steps: Step[] = [
      { press: true },
      ...frames(1),
      { release: true },
      ...frames(0),
      { press: true },
      ...frames(0.5, 1),
    ];
    expect(session(steps).completes).toBe(2);
  });

  test('haptics fire only while holding', () => {
    let track = holdPress(HOLD_IDLE).track;
    track = holdRelease(track);
    expect(holdFrame(track, 0.5).impacts).toEqual([]);
  });
});

describe('run back', () => {
  test('takes 200 ms, and jumps to empty under Reduce Motion', () => {
    expect(holdRunBackMs(false)).toBe(200);
    expect(holdRunBackMs(true)).toBe(0);
  });
});
