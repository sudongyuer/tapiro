import { describe, expect, test } from 'bun:test';

import { createStartPost } from './startPost';
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
  const start = createStartPost({
    status: () => {
      log.push('status');
      return answer();
    },
    open: () => log.push('open'),
    hint: (status) => log.push(`hint:${status.unpaid.length}`),
  });
  return { start, log };
}

describe('start post (13A)', () => {
  test('opens the form before the status answers', async () => {
    let release!: (status: PostStatus) => void;
    const { start, log } = setup(() => new Promise((done) => (release = done)));
    const running = start();
    expect(log).toEqual(['open', 'status']);
    release(BLOCKED);
    await running;
    expect(log).toEqual(['open', 'status', 'hint:1']);
  });

  test('asks once per tap and hints only when blocked', async () => {
    const free = setup(async () => STATUS);
    await free.start();
    await free.start();
    expect(free.log).toEqual(['open', 'status', 'open', 'status']);
  });

  test('a failed status load shows nothing', async () => {
    const failing = setup(async () => {
      throw new TypeError('Network request failed');
    });
    await failing.start();
    expect(failing.log).toEqual(['open', 'status']);
  });
});
