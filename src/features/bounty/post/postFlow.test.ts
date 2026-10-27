import { describe, expect, test } from 'bun:test';

import { canPublish, createPostFlow, type FlowDeps } from './postFlow';
import type { PostDraft, PostStatus, PublishArgs, PublishOutcome } from './types';

const NOW = new Date('2026-10-27T09:00:00.000Z');

const STATUS: PostStatus = {
  blocked: false,
  unpaid: [],
  coins: 0,
  freePostsLeft: 2,
  freePostsPerMonth: 3,
  nextFreeAt: '2026-10-31T16:00:00.000Z',
};

const DRAFT: PostDraft = {
  id: 'draft-1',
  title: '帮我取个快递',
  category: 'pickup',
  rewardText: '8',
  description: null,
  time: { kind: 'none' },
  place: null,
  updatedAt: NOW.toISOString(),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function setup({
  statuses = [STATUS] as (PostStatus | Error)[],
  outcomes = [
    { ok: true, result: { id: 'draft-1', status: 'open', charge: 'free', expiresAt: '' } },
  ] as PublishOutcome[],
  draft = DRAFT,
} = {}) {
  const calls = {
    status: 0,
    published: [] as PublishArgs[],
    cleared: 0,
    done: 0,
    invalid: [] as string[],
    sent: 0,
  };
  let current: PostDraft | null = draft;
  const deps: FlowDeps = {
    service: {
      async status() {
        const next = statuses[Math.min(calls.status, statuses.length - 1)];
        calls.status += 1;
        if (next instanceof Error) throw next;
        return next;
      },
      async publish(args) {
        calls.published.push(args);
        return outcomes[Math.min(calls.published.length - 1, outcomes.length - 1)];
      },
      async isPublished() {
        return false;
      },
    },
    draft: () => current ?? { ...DRAFT, id: 'fresh', title: '' },
    clearDraft: () => {
      calls.cleared += 1;
      current = null;
    },
    now: () => NOW,
  };
  const handlers = {
    onPublished: () => (calls.done += 1),
    onInvalid: (error: string) => calls.invalid.push(error),
    onAlreadySent: () => (calls.sent += 1),
  };
  const created = createPostFlow(deps);
  const flow = { ...created, publish: () => created.publish(handlers) };
  return { flow, calls, deps, draft: () => current };
}

describe('post flow', () => {
  test('status goes loading → ready, or loading → failed', async () => {
    const ok = setup();
    expect(ok.flow.get().status.kind).toBe('loading');
    await ok.flow.load();
    expect(ok.flow.get().status.kind).toBe('ready');

    const broken = setup({ statuses: [new TypeError('Network request failed')] });
    await broken.flow.load();
    expect(broken.flow.get().status.kind).toBe('failed');
  });

  test('publishing is allowed only when ready and not blocked or out of balance', async () => {
    const loading = setup();
    await loading.flow.publish();
    expect(loading.calls.published).toHaveLength(0);

    for (const status of [
      {
        ...STATUS,
        blocked: true,
        unpaid: [{ paymentId: 'p', payeeName: '阿杰', amountSen: 1500, createdAt: '' }],
      },
      { ...STATUS, freePostsLeft: 0, coins: 0 },
    ]) {
      const flow = setup({ statuses: [status] });
      await flow.flow.load();
      expect(canPublish(flow.flow.get())).toBe(false);
      await flow.flow.publish();
      expect(flow.calls.published).toHaveLength(0);
    }

    const coin = setup({ statuses: [{ ...STATUS, freePostsLeft: 0, coins: 4 }] });
    await coin.flow.load();
    expect(canPublish(coin.flow.get())).toBe(true);
  });

  test('a second tap while busy sends nothing', async () => {
    const answer = deferred<PublishOutcome>();
    const { flow, calls, deps } = setup();
    deps.service.publish = async (args) => {
      calls.published.push(args);
      return answer.promise;
    };
    await flow.load();
    const first = flow.publish();
    await Promise.resolve();
    expect(flow.get().busy).toBe(true);
    await flow.publish();
    expect(calls.published).toHaveLength(1);
    answer.resolve({ ok: false, reason: 'failed' });
    await first;
    expect(flow.get().busy).toBe(false);
  });

  test('a failed publish keeps the draft and retries with the same id, never on its own', async () => {
    const { flow, calls, draft } = setup({
      outcomes: [
        { ok: false, reason: 'failed' },
        { ok: true, result: { id: 'draft-1', status: 'open', charge: 'free', expiresAt: '' } },
      ],
    });
    await flow.load();
    await flow.publish();
    expect(flow.get().rejected).toBe('failed');
    expect(draft()).not.toBeNull();
    expect(calls.cleared).toBe(0);
    expect(calls.published).toHaveLength(1);
    await flow.publish();
    expect(calls.published.map((args) => args.id)).toEqual(['draft-1', 'draft-1']);
    expect(flow.get().rejected).toBeNull();
  });

  test('blocked and noBalance rejections reload the status', async () => {
    for (const reason of ['blocked', 'noBalance'] as const) {
      const blocked = {
        ...STATUS,
        blocked: true,
        unpaid: [{ paymentId: 'p', payeeName: '阿杰', amountSen: 1500, createdAt: '' }],
      };
      const { flow, calls } = setup({
        statuses: [STATUS, blocked],
        outcomes: [{ ok: false, reason }],
      });
      await flow.load();
      await flow.publish();
      expect(calls.status).toBe(2);
      expect(flow.get().status).toEqual({ kind: 'ready', status: blocked });
      expect(calls.cleared).toBe(0);
    }
  });

  test('a draft that no longer passes goes back to the form with its error', async () => {
    const past = {
      ...DRAFT,
      time: { kind: 'deadline' as const, deadlineAt: '2026-10-27T08:00:00.000Z' },
    };
    const { flow, calls } = setup({ draft: past });
    await flow.load();
    await flow.publish();
    expect(calls.invalid).toEqual(['timePast']);
    expect(calls.published).toHaveLength(0);
  });

  test('a server invalid answer is shown, and the draft stays', async () => {
    const { flow, calls } = setup({ outcomes: [{ ok: false, reason: 'invalid' }] });
    await flow.load();
    await flow.publish();
    expect(flow.get().rejected).toBe('invalid');
    expect(calls.cleared).toBe(0);
  });

  test('an already-sent answer clears the draft and says so, without publishing again', async () => {
    const { flow, calls, draft } = setup({ outcomes: [{ ok: false, reason: 'alreadySent' }] });
    await flow.load();
    await flow.publish();
    expect(calls.sent).toBe(1);
    expect(calls.cleared).toBe(1);
    expect(draft()).toBeNull();
    expect(calls.done).toBe(0);
    expect(calls.published).toHaveLength(1);
    expect(flow.get()).toMatchObject({ busy: false, rejected: null });
  });

  test('success clears the draft once and reports once', async () => {
    const { flow, calls } = setup();
    await flow.load();
    await flow.publish();
    expect(calls.cleared).toBe(1);
    expect(calls.done).toBe(1);
    expect(calls.published[0]).toMatchObject({
      id: 'draft-1',
      reward_sen: 800,
      category: 'pickup',
    });
  });
});
