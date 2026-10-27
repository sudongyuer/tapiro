import { describe, expect, test } from 'bun:test';

import { createHintGate, createStartPost } from './startPost';
import type { PostStatus } from './types';

const STATUS: PostStatus = {
  blocked: false,
  unpaid: [],
  coins: 0,
  freePostsLeft: 2,
  freePostsPerMonth: 3,
  nextFreeAt: '2026-10-31T16:00:00.000Z',
};
const BLOCKED: PostStatus = {
  ...STATUS,
  blocked: true,
  unpaid: [
    { paymentId: 'p', payeeName: '阿杰', amountSen: 1500, createdAt: '2026-10-19T09:00:00.000Z' },
  ],
};

function setup(answer: () => Promise<PostStatus>) {
  const log: string[] = [];
  const gate = createHintGate();
  gate.setPresenter((status) => log.push(`hint:${status.unpaid.length}`));
  const start = createStartPost({
    status: () => {
      log.push('status');
      return answer();
    },
    open: () => log.push('open'),
    gate,
  });
  return { start, gate, log };
}

function later() {
  let release!: (status: PostStatus) => void;
  const answer = () => new Promise<PostStatus>((done) => (release = done));
  return { answer, release: (status: PostStatus) => release(status) };
}

describe('start post (13A)', () => {
  test('opens the form before the status answers, then hints over the form', async () => {
    const pending = later();
    const { start, gate, log } = setup(pending.answer);
    const running = start();
    expect(log).toEqual(['open', 'status']);
    gate.formFocused();
    pending.release(BLOCKED);
    await running;
    expect(log).toEqual(['open', 'status', 'hint:1']);
  });

  test('an answer that arrives before the form appears waits for it', async () => {
    const { start, gate, log } = setup(async () => BLOCKED);
    await start();
    expect(log).toEqual(['open', 'status']);
    gate.formFocused();
    expect(log).toEqual(['open', 'status', 'hint:1']);
  });

  test('no hint once the user moved on to confirm', async () => {
    const pending = later();
    const { start, gate, log } = setup(pending.answer);
    const running = start();
    gate.formFocused();
    gate.formBlurred();
    pending.release(BLOCKED);
    await running;
    gate.formFocused();
    expect(log).toEqual(['open', 'status']);
  });

  test('no hint after the sheet was cancelled before the answer', async () => {
    const pending = later();
    const { start, gate, log } = setup(pending.answer);
    const running = start();
    gate.formFocused();
    gate.formBlurred();
    pending.release(BLOCKED);
    await running;
    expect(log).toEqual(['open', 'status']);
  });

  test('a late answer from an earlier tap is ignored', async () => {
    const first = later();
    const { gate, log } = setup(first.answer);
    const startFirst = createStartPost({ status: first.answer, open: () => {}, gate });
    const running = startFirst();
    const second = createStartPost({ status: async () => STATUS, open: () => {}, gate });
    await second();
    gate.formFocused();
    first.release(BLOCKED);
    await running;
    expect(log).toEqual([]);
  });

  test('asks once per tap and hints only when blocked', async () => {
    const free = setup(async () => STATUS);
    await free.start();
    free.gate.formFocused();
    free.gate.formBlurred();
    await free.start();
    free.gate.formFocused();
    expect(free.log).toEqual(['open', 'status', 'open', 'status']);
  });

  test('a failed status load shows nothing', async () => {
    const failing = setup(async () => {
      throw new TypeError('Network request failed');
    });
    await failing.start();
    failing.gate.formFocused();
    expect(failing.log).toEqual(['open', 'status']);
  });
});
