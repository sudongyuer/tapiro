import { describe, expect, test } from 'bun:test';

import { createBlockFlow, createBlockList } from './blockFlow';
import type { BlockOutcome, BlockService, BlockedPerson } from './types';

type Deferred<T> = { resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>() {
  const pending: Deferred<T>[] = [];
  const next = () => new Promise<T>((resolve, reject) => pending.push({ resolve, reject }));
  return { pending, next };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const LIN: BlockedPerson = { id: 'lin', name: '小林' };
const JIE: BlockedPerson = { id: 'jie', name: '阿杰' };

describe('block flow', () => {
  function setup() {
    const answers = deferred<BlockOutcome>();
    const calls: string[] = [];
    const blocked: string[] = [];
    const flow = createBlockFlow({
      service: {
        block: (target) => {
          calls.push(target);
          return answers.next();
        },
      },
      blocked: (id) => blocked.push(id),
    });
    return { flow, answers, calls, blocked };
  }

  test('shows progress until the server answers, then tells the board', async () => {
    const { flow, answers, blocked } = setup();
    const done = flow.block('lin');
    expect(flow.get()).toBe('busy');
    expect(blocked).toEqual([]);
    answers.pending[0].resolve('blocked');
    expect(await done).toBe(true);
    expect(flow.get()).toBe('idle');
    expect(blocked).toEqual(['lin']);
  });

  test('a poster whose account is gone also closes the detail', async () => {
    const { flow, answers, blocked } = setup();
    const done = flow.block('lin');
    answers.pending[0].resolve('gone');
    expect(await done).toBe(true);
    expect(blocked).toEqual(['lin']);
  });

  test('a failure is shown, never replayed, and the board is not told', async () => {
    const { flow, answers, calls, blocked } = setup();
    const done = flow.block('lin');
    answers.pending[0].reject(new TypeError('Network request failed'));
    expect(await done).toBe(false);
    await settle();
    expect(flow.get()).toBe('failed');
    expect(calls).toEqual(['lin']);
    expect(blocked).toEqual([]);
  });

  test('a second tap while blocking sends nothing', async () => {
    const { flow, calls } = setup();
    void flow.block('lin');
    expect(await flow.block('lin')).toBe(false);
    expect(calls).toEqual(['lin']);
  });
});

describe('block list', () => {
  function setup() {
    const lists = deferred<BlockedPerson[]>();
    const unblocks = deferred<void>();
    const unblocked: string[] = [];
    const service: BlockService = {
      block: async () => 'blocked',
      list: () => lists.next(),
      unblock: (target) => {
        unblocked.push(target);
        return unblocks.next();
      },
    };
    return { list: createBlockList(service), lists, unblocks, unblocked };
  }

  async function ready(people: BlockedPerson[]) {
    const s = setup();
    const loading = s.list.load();
    s.lists.pending[0].resolve(people);
    await loading;
    return s;
  }

  test('a failed first load is a failure, not an empty list', async () => {
    const { list, lists } = setup();
    expect(list.get().kind).toBe('loading');
    const loading = list.load();
    lists.pending[0].reject(new Error('offline'));
    await loading;
    expect(list.get()).toEqual({ kind: 'failed', retrying: false });
    void list.load();
    expect(list.get()).toEqual({ kind: 'failed', retrying: true });
  });

  test('a failed refresh keeps the names and says they may be old', async () => {
    const { list, lists } = await ready([LIN]);
    const loading = list.load();
    lists.pending[1].reject(new Error('offline'));
    await loading;
    const state = list.get();
    expect(state.kind === 'ready' && state.people).toEqual([LIN]);
    expect(state.kind === 'ready' && state.refreshFailed).toBe(true);
  });

  test('解除 keeps the row with progress until the server confirms, then removes it', async () => {
    const { list, unblocks, unblocked } = await ready([LIN, JIE]);
    const running = list.unblock('lin');
    let state = list.get();
    expect(state.kind === 'ready' && state.unblocking).toEqual(['lin']);
    expect(state.kind === 'ready' && state.people).toEqual([LIN, JIE]);
    void list.unblock('lin');
    expect(unblocked).toEqual(['lin']);
    unblocks.pending[0].resolve();
    await running;
    state = list.get();
    expect(state.kind === 'ready' && state.people).toEqual([JIE]);
    expect(state.kind === 'ready' && state.unblocking).toEqual([]);
  });

  test('a failed 解除 keeps the row, says so, and does not retry', async () => {
    const { list, unblocks, unblocked } = await ready([LIN]);
    const running = list.unblock('lin');
    unblocks.pending[0].reject(new Error('offline'));
    await running;
    const state = list.get();
    expect(state.kind === 'ready' && state.people).toEqual([LIN]);
    expect(state.kind === 'ready' && state.unblockFailed).toBe(true);
    expect(unblocked).toEqual(['lin']);
  });

  test('a load that started before a 解除 landed cannot bring the row back', async () => {
    const { list, lists, unblocks } = await ready([LIN, JIE]);
    const loading = list.load();
    const running = list.unblock('lin');
    unblocks.pending[0].resolve();
    await running;
    lists.pending[1].resolve([LIN, JIE]);
    await loading;
    const state = list.get();
    expect(state.kind === 'ready' && state.people).toEqual([JIE]);
  });
});
