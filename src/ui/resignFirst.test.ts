import { describe, expect, test } from 'bun:test';

import { createResignFirst } from './resignFirst';

function controlledResign() {
  const log: string[] = [];
  const finishes: (() => void)[] = [];
  const resign = () =>
    new Promise<void>((resolve) => {
      log.push('resign');
      finishes.push(() => {
        log.push('resigned');
        resolve();
      });
    });
  return { log, resign, finish: () => finishes.shift()?.() };
}

describe('resignFirst', () => {
  test('the action that unmounts the sheet waits until the resign has finished', async () => {
    const { log, resign, finish } = controlledResign();
    const close = createResignFirst(resign)(() => log.push('unmount'));
    const done = close();
    await Promise.resolve();
    await Promise.resolve();
    expect(log).toEqual(['resign']);
    finish();
    await done;
    expect(log).toEqual(['resign', 'resigned', 'unmount']);
  });

  test('passes the arguments through to the action', async () => {
    const seen: unknown[] = [];
    const save = createResignFirst(async () => {})((at: number, note: string) =>
      seen.push(at, note),
    );
    await save(7, 'gate B');
    expect(seen).toEqual([7, 'gate B']);
  });

  test('a second tap while the resign is pending does not run the action twice', async () => {
    const { log, resign, finish } = controlledResign();
    const close = createResignFirst(resign)(() => log.push('unmount'));
    const first = close();
    const second = close();
    await Promise.resolve();
    finish();
    await Promise.all([first, second]);
    expect(log).toEqual(['resign', 'resigned', 'unmount']);
    const later = close();
    await Promise.resolve();
    finish();
    await later;
    expect(log.filter((entry) => entry === 'unmount')).toHaveLength(2);
  });

  test('a failed resign still lets the sheet close', async () => {
    let closed = false;
    const close = createResignFirst(() => Promise.reject(new Error('no kit')))(() => {
      closed = true;
    });
    await close();
    expect(closed).toBe(true);
  });
});
