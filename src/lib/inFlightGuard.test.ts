import { describe, expect, test } from 'bun:test';

import { createInFlightGuard } from './inFlightGuard';

describe('createInFlightGuard', () => {
  test('ignores calls while a task is running and accepts the next one afterwards', async () => {
    const run = createInFlightGuard();
    let release = () => {};
    let calls = 0;
    const task = () => {
      calls++;
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    };
    const first = run(task);
    await run(task);
    expect(calls).toBe(1);
    release();
    await first;
    const second = run(task);
    release();
    await second;
    expect(calls).toBe(2);
  });

  test('a throwing task releases the guard', async () => {
    const run = createInFlightGuard();
    await expect(run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    let ran = false;
    await run(async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});
