import { describe, expect, test } from 'bun:test';

import { runSettledCollect, type SettledExit } from './settledCollect';

function harness(flight: () => Promise<{ landed: boolean }>) {
  const log: string[] = [];
  const exits: (() => void)[] = [];
  const steps = {
    collect: () => log.push('collect'),
    fly: () => {
      log.push('fly');
      return flight();
    },
    haptic: () => log.push('haptic'),
    announce: () => log.push('announce'),
    exit: (kind: SettledExit) => {
      log.push(`exit:${kind}`);
      return new Promise<void>((resolve) =>
        exits.push(() => {
          log.push(`exited:${kind}`);
          resolve();
        }),
      );
    },
    dismiss: () => log.push('dismiss'),
  };
  return { log, steps, exits };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferredFlight() {
  let resolve: (value: { landed: boolean }) => void = () => undefined;
  const promise = new Promise<{ landed: boolean }>((r) => (resolve = r));
  return { promise, resolve };
}

describe('runSettledCollect', () => {
  test('collects before the flight lands and leaves the card only after it lands', async () => {
    const flight = deferredFlight();
    const { log, steps, exits } = harness(() => flight.promise);
    const done = runSettledCollect(steps, false);
    await tick();
    expect(log).toEqual(['collect', 'fly']);
    flight.resolve({ landed: true });
    await tick();
    expect(log).toEqual(['collect', 'fly', 'announce', 'exit:leave']);
    exits[0]();
    await done;
    expect(log).toEqual(['collect', 'fly', 'announce', 'exit:leave', 'exited:leave', 'dismiss']);
  });

  test('a flight that cannot land plays the haptic and fades the card in place', async () => {
    const { log, steps, exits } = harness(async () => ({ landed: false }));
    const done = runSettledCollect(steps, false);
    await tick();
    exits[0]();
    await done;
    expect(log).toEqual([
      'collect',
      'fly',
      'haptic',
      'announce',
      'exit:fade',
      'exited:fade',
      'dismiss',
    ]);
  });

  test('a flight that throws is treated as not landed', async () => {
    const { log, steps, exits } = harness(() => Promise.reject(new Error('kit')));
    const done = runSettledCollect(steps, false);
    await tick();
    exits[0]();
    await done;
    expect(log).toEqual([
      'collect',
      'fly',
      'haptic',
      'announce',
      'exit:fade',
      'exited:fade',
      'dismiss',
    ]);
  });

  test('under Reduce Motion the card fades with the sticker, and the kit plays the haptic', async () => {
    const flight = deferredFlight();
    const { log, steps, exits } = harness(() => flight.promise);
    const done = runSettledCollect(steps, true);
    await tick();
    expect(log).toEqual(['collect', 'fly', 'exit:fade']);
    flight.resolve({ landed: true });
    await tick();
    exits[0]();
    await done;
    expect(log).toEqual(['collect', 'fly', 'exit:fade', 'announce', 'exited:fade', 'dismiss']);
  });

  test('under Reduce Motion an unlanded flight plays the haptic without waiting for the fade', async () => {
    const { log, steps, exits } = harness(async () => ({ landed: false }));
    const done = runSettledCollect(steps, true);
    await tick();
    expect(log).toEqual(['collect', 'fly', 'exit:fade', 'haptic', 'announce']);
    exits[0]();
    await done;
    expect(log.filter((entry) => entry === 'announce')).toHaveLength(1);
    expect(log.at(-1)).toBe('dismiss');
  });
});
