import { describe, expect, test } from 'bun:test';

import { createBlockEvents } from '@/features/block/blockEvents';
import { createBlockFlow } from '@/features/block/blockFlow';
import type { BlockOutcome, BlockedPerson } from '@/features/block/types';

import { INITIAL_SELECT, selectReducer, type SelectEvent, type SelectState } from './selectState';

type Deferred<T> = { resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>() {
  const pending: Deferred<T>[] = [];
  const next = () => new Promise<T>((resolve, reject) => pending.push({ resolve, reject }));
  return { pending, next };
}

describe('block from the applicant list', () => {
  const HANA: BlockedPerson = { id: 'fixture-applicant-hana', name: 'Hana' };

  function wired() {
    const answers = deferred<BlockOutcome>();
    const events = createBlockEvents();
    const select = { state: INITIAL_SELECT };
    const dispatch = (event: SelectEvent) => {
      select.state = selectReducer(select.state, event);
    };
    events.onBlocked((id) => dispatch({ type: 'blocked', id, request: 2 }));
    const flow = createBlockFlow({
      service: { block: () => answers.next() },
      blocked: events.blocked,
    });
    const ready: SelectEvent[] = [
      { type: 'loadStarted', request: 1 },
      {
        type: 'loaded',
        request: 1,
        at: '2026-10-29T00:00:00Z',
        applicants: ['jie', HANA.id].map((id) => ({
          id,
          name: id,
          tier: 'reliable',
          helpedCount: 0,
          note: null,
          status: 'pending',
          appliedAt: '2026-10-29T00:00:00Z',
        })),
      },
      { type: 'chose', id: HANA.id },
    ];
    for (const event of ready) dispatch(event);
    return { flow, answers, select };
  }

  const rows = (state: SelectState) =>
    state.list.kind === 'ready' ? state.list.applicants.map((row) => row.id) : [];

  test('the row stays while blocking and leaves with its check once the server answers', async () => {
    const { flow, answers, select } = wired();
    const done = flow.block(HANA.id);
    expect(rows(select.state)).toContain(HANA.id);
    expect(select.state.chosen).toBe(HANA.id);
    answers.pending[0].resolve('blocked');
    expect(await done).toBe(true);
    expect(rows(select.state)).toEqual(['jie']);
    expect(select.state.chosen).toBeNull();
  });

  test('a failure keeps the row and the check', async () => {
    const { flow, answers, select } = wired();
    const done = flow.block(HANA.id);
    answers.pending[0].reject(new TypeError('Network request failed'));
    expect(await done).toBe(false);
    expect(flow.get()).toBe('failed');
    expect(rows(select.state)).toEqual(['jie', HANA.id]);
    expect(select.state.chosen).toBe(HANA.id);
  });
});
