import { describe, expect, test } from 'bun:test';

import { createRideHistory } from './historyState';
import type { RideSummary } from './types';

const AT = new Date('2026-11-21T08:00:00.000Z');
const ride = (id: string) => ({ id }) as RideSummary;

function setup(answers: (RideSummary[] | Error)[]) {
  let loads = 0;
  const history = createRideHistory({
    load: async () => {
      loads += 1;
      const next = answers.shift() ?? [];
      if (next instanceof Error) throw next;
      return next;
    },
    now: () => AT,
  });
  return { history, loads: () => loads };
}

describe('ride history', () => {
  test('a reload replaces the rides with the new answer', async () => {
    const { history, loads } = setup([[ride('a')], [ride('b'), ride('a')]]);
    await history.load();
    await history.load();
    expect(loads()).toBe(2);
    expect(history.get()).toMatchObject({ kind: 'ready', stale: false, busy: false });
    const state = history.get();
    expect(state.kind === 'ready' && state.rides.map((r) => r.id)).toEqual(['b', 'a']);
  });

  test('a failed reload keeps the rides and marks them stale, never empty', async () => {
    const { history } = setup([[ride('a')], new Error('offline')]);
    await history.load();
    await history.load();
    const state = history.get();
    expect(state).toMatchObject({ kind: 'ready', stale: true, loadedAt: AT.toISOString() });
    expect(state.kind === 'ready' && state.rides.map((r) => r.id)).toEqual(['a']);
  });

  test('a failed first load is a failure, and the retry shows it busy', async () => {
    const { history } = setup([new Error('offline'), [ride('a')]]);
    await history.load();
    expect(history.get()).toEqual({ kind: 'failed', busy: false });
    const retry = history.load();
    expect(history.get()).toEqual({ kind: 'failed', busy: true });
    await retry;
    expect(history.get().kind).toBe('ready');
  });

  test('only the latest load lands', async () => {
    let release: (rides: RideSummary[]) => void = () => undefined;
    const answers = [
      () => new Promise<RideSummary[]>((resolve) => (release = resolve)),
      async () => [ride('new')],
    ];
    const history = createRideHistory({ load: () => answers.shift()!(), now: () => AT });
    const slow = history.load();
    await history.load();
    release([ride('old')]);
    await slow;
    const state = history.get();
    expect(state.kind === 'ready' && state.rides.map((r) => r.id)).toEqual(['new']);
  });
});
