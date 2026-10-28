import { describe, expect, test } from 'bun:test';

import type { ApplyOutcome } from '../board/types';
import { createBountyCache } from '../shared/bountyCache';
import { createJustApplied } from '../shared/justApplied';
import { createApplyFlow, createWithdrawFlow } from './applyFlow';
import {
  applyReducer,
  canSend,
  detailNotice,
  noteCount,
  noteFits,
  noteToSend,
  withdrawReducer,
} from './applyState';
import { createNoteDrafts } from './noteDrafts';

function gate<T>() {
  let open: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

function setup(hasPayee: boolean | 'throws' = true) {
  const answers: ReturnType<typeof gate<ApplyOutcome>>[] = [];
  const sent: (string | null)[] = [];
  const service = {
    hasPayeeMethod: async () => {
      if (hasPayee === 'throws') throw new Error('offline');
      return hasPayee;
    },
    apply: (_id: string, note: string | null) => {
      sent.push(note);
      const answer = gate<ApplyOutcome>();
      answers.push(answer);
      return answer.promise;
    },
  };
  const cache = createBountyCache();
  const changes: { id: string; applied: boolean; note: string | null }[] = [];
  cache.onApplicationChange((change) => changes.push(change));
  const just = createJustApplied();
  const drafts = createNoteDrafts();
  const flow = createApplyFlow('b1', 'card', { service, cache, justApplied: just, drafts });
  return { flow, answers, sent, changes, just, drafts };
}

describe('apply flow', () => {
  test('checks the payee method first and shows the form or the no-payee state', async () => {
    const withPayee = setup(true);
    expect(withPayee.flow.get().kind).toBe('checking');
    await withPayee.flow.check();
    expect(withPayee.flow.get()).toEqual({ kind: 'form', sending: false, reason: null });

    const without = setup(false);
    await without.flow.check();
    expect(without.flow.get().kind).toBe('noPayee');
  });

  test('a failed payee check leaves the decision to the server', async () => {
    const { flow } = setup('throws');
    await flow.check();
    expect(flow.get().kind).toBe('form');
  });

  test('sends once while busy, then marks the board and the detail applied and closes', async () => {
    const { flow, answers, sent, changes, just, drafts } = setup();
    await flow.check();
    drafts.set('b1', '  我住在隔壁栋 ');
    const first = flow.send();
    void flow.send();
    expect(sent).toEqual(['我住在隔壁栋']);
    expect(flow.get()).toEqual({ kind: 'form', sending: true, reason: null });
    expect(changes).toEqual([]);

    answers[0]?.open({ ok: true, note: '我住在隔壁栋' });
    await first;
    expect(flow.get()).toEqual({ kind: 'sent', note: '我住在隔壁栋' });
    expect(changes).toEqual([{ id: 'b1', applied: true, note: '我住在隔壁栋' }]);
    expect(just.take('b1', 'card')).toBe(false);
    just.sheetGone();
    expect(just.take('b1', 'detail')).toBe(false);
    expect(just.take('b1', 'card')).toBe(true);
    expect(just.take('b1', 'card')).toBe(false);
    expect(drafts.get('b1')).toBe('');
  });

  test('a failure keeps the note, marks nothing and does not retry by itself', async () => {
    const { flow, answers, sent, changes, just, drafts } = setup();
    await flow.check();
    drafts.set('b1', 'on my way');
    const sending = flow.send();
    answers[0]?.open({ ok: false, reason: 'failed' });
    await sending;
    expect(flow.get()).toEqual({ kind: 'form', sending: false, reason: 'failed' });
    expect(drafts.get('b1')).toBe('on my way');
    expect(changes).toEqual([]);
    just.sheetGone();
    expect(just.take('b1', 'card')).toBe(false);
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    expect(canSend(flow.get(), '')).toBe(true);

    const again = flow.send();
    answers[1]?.open({ ok: true, note: 'on my way' });
    await again;
    expect(sent).toEqual(['on my way', 'on my way']);
    expect(flow.get().kind).toBe('sent');
  });

  test('a thrown request counts as a failure', async () => {
    const cache = createBountyCache();
    const drafts = createNoteDrafts();
    const flow = createApplyFlow('b1', 'detail', {
      service: { hasPayeeMethod: async () => true, apply: () => Promise.reject(new Error('x')) },
      cache,
      justApplied: createJustApplied(),
      drafts,
    });
    await flow.check();
    await flow.send();
    expect(flow.get()).toEqual({ kind: 'form', sending: false, reason: 'failed' });
  });

  for (const reason of ['closed', 'taken', 'gone', 'own'] as const) {
    test(`${reason} shows the reason and disables sending`, async () => {
      const { flow, answers, sent } = setup();
      await flow.check();
      const sending = flow.send();
      answers[0]?.open({ ok: false, reason });
      await sending;
      expect(flow.get()).toEqual({ kind: 'form', sending: false, reason });
      expect(canSend(flow.get(), '')).toBe(false);
      await flow.send();
      expect(sent).toHaveLength(1);
    });
  }

  test('a note over 140 code points is not sent, even when the field allows it', async () => {
    const { flow, sent, drafts } = setup();
    await flow.check();
    const thumbs = '👍🏽'.repeat(71);
    expect(noteCount(thumbs)).toBe(142);
    expect(noteFits(thumbs)).toBe(false);
    drafts.set('b1', thumbs);
    expect(canSend(flow.get(), thumbs)).toBe(false);
    await flow.send();
    expect(sent).toEqual([]);
    expect(flow.get()).toEqual({ kind: 'form', sending: false, reason: null });
    const fits = '👍🏽'.repeat(70);
    expect(noteFits(fits)).toBe(true);
    drafts.set('b1', fits);
    void flow.send();
    expect(sent).toEqual([fits]);
  });

  test('noPayee from the server switches to the no-payee state', async () => {
    const { flow, answers } = setup();
    await flow.check();
    const sending = flow.send();
    answers[0]?.open({ ok: false, reason: 'noPayee' });
    await sending;
    expect(flow.get().kind).toBe('noPayee');
    expect(canSend(flow.get(), '')).toBe(false);
  });

  test('an answer without a send in flight is ignored', () => {
    const state = { kind: 'form', sending: false, reason: null } as const;
    expect(applyReducer(state, { type: 'answered', answer: { ok: true, note: null } })).toBe(state);
  });
});

describe('note', () => {
  test('an empty or blank note is sent as null', () => {
    expect(noteToSend('')).toBeNull();
    expect(noteToSend(' \n ')).toBeNull();
    expect(noteToSend(' hi ')).toBe('hi');
  });

  test('counts code points after trimming', () => {
    expect(noteCount(' 你好👋🏽 ')).toBe(4);
    expect(noteCount('')).toBe(0);
  });

  test('drafts are kept per bounty until cleared', () => {
    const drafts = createNoteDrafts();
    drafts.set('b1', 'a');
    drafts.set('b2', 'b');
    expect(drafts.get('b1')).toBe('a');
    drafts.set('b1', '');
    expect(drafts.get('b1')).toBe('');
    drafts.clear();
    expect(drafts.get('b2')).toBe('');
  });

  test('a seeded note fills every bounty until that bounty is edited or sent', () => {
    const drafts = createNoteDrafts('seed');
    expect(drafts.get('b1')).toBe('seed');
    drafts.set('b1', '');
    expect(drafts.get('b1')).toBe('');
    expect(drafts.get('b2')).toBe('seed');
  });
});

describe('withdraw flow', () => {
  function withdrawSetup(
    answer: () => Promise<{ ok: true } | { ok: false; reason: 'notPending' | 'failed' }>,
  ) {
    const cache = createBountyCache();
    const changes: boolean[] = [];
    cache.onApplicationChange((change) => changes.push(change.applied));
    let reloads = 0;
    const flow = createWithdrawFlow('b1', {
      service: { withdraw: answer },
      cache,
      reload: () => {
        reloads += 1;
      },
    });
    return { flow, changes, reloads: () => reloads };
  }

  test('confirm → busy → withdrawn on the board and the detail', async () => {
    const answer = gate<{ ok: true }>();
    let calls = 0;
    const { flow, changes } = withdrawSetup(() => {
      calls += 1;
      return answer.promise;
    });
    const running = flow.withdraw();
    void flow.withdraw();
    expect(flow.get().kind).toBe('busy');
    expect(calls).toBe(1);
    answer.open({ ok: true });
    await running;
    expect(flow.get().kind).toBe('idle');
    expect(changes).toEqual([false]);
  });

  test('notPending reloads the detail, marks nothing and says why', async () => {
    const { flow, changes, reloads } = withdrawSetup(async () => ({
      ok: false,
      reason: 'notPending',
    }));
    await flow.withdraw();
    expect(reloads()).toBe(1);
    expect(changes).toEqual([]);
    expect(flow.get()).toEqual({ kind: 'notPending', reloaded: false });
  });

  test('notPending yields to a failed reload, shows once current, and clears on the next load', () => {
    let state = withdrawReducer(
      { kind: 'busy' },
      {
        type: 'answered',
        answer: { ok: false, reason: 'notPending' },
      },
    );
    expect(detailNotice(false, state)).toBeNull();
    expect(detailNotice(true, state)).toBe('stale');
    state = withdrawReducer(state, { type: 'loaded' });
    expect(detailNotice(true, state)).toBe('stale');
    expect(detailNotice(false, state)).toBe('notPending');
    state = withdrawReducer(state, { type: 'loaded' });
    expect(state.kind).toBe('idle');
    expect(detailNotice(false, state)).toBeNull();
    expect(withdrawReducer({ kind: 'idle' }, { type: 'loaded' })).toEqual({ kind: 'idle' });
  });

  test('a failure shows and is not retried', async () => {
    let calls = 0;
    const { flow, changes, reloads } = withdrawSetup(async () => {
      calls += 1;
      return { ok: false, reason: 'failed' };
    });
    await flow.withdraw();
    expect(flow.get().kind).toBe('failed');
    expect(calls).toBe(1);
    expect(changes).toEqual([]);
    expect(reloads()).toBe(0);
    expect(withdrawReducer({ kind: 'failed' }, { type: 'started' }).kind).toBe('busy');
  });
});
