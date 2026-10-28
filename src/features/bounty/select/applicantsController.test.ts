import { describe, expect, test } from 'bun:test';

import type { BountyDetail } from '../board/types';
import { createApplicantsController, selectedHelper } from './applicantsController';
import type { Applicant, SelectOutcome } from './types';

const applicant = (id: string, patch: Partial<Applicant> = {}): Applicant => ({
  id,
  name: id,
  tier: 'reliable',
  note: null,
  status: 'pending',
  appliedAt: '2026-10-28T03:00:00.000Z',
  helpedCount: 0,
  ...patch,
});

const DETAIL: BountyDetail = {
  id: 'b1',
  title: '帮取快递',
  description: null,
  category: 'pickup',
  rewardSen: 800,
  status: 'open',
  viewerRole: 'poster',
  place: null,
  distanceM: null,
  address: 'A 座 12-03',
  startsAt: null,
  endsAt: null,
  deadlineAt: null,
  expiresAt: '2026-11-03T03:00:00.000Z',
  poster: { id: 'me', name: '林小貘', tier: 'reliable' },
  helper: null,
  myApplication: null,
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const HANA = { id: 'hana', name: 'hana', tier: 'reliable' } as const;
const JIE = { id: 'jie', name: '阿杰', tier: 'very_reliable' } as const;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function harness() {
  const lists: Deferred<Applicant[] | 'gone'>[] = [];
  const details: Deferred<BountyDetail | 'gone'>[] = [];
  const selects: { args: [string, string]; answer: Deferred<SelectOutcome> }[] = [];
  const controller = createApplicantsController('b1', {
    service: {
      applicants: () => {
        const next = deferred<Applicant[] | 'gone'>();
        lists.push(next);
        return next.promise;
      },
      select: (bounty, id) => {
        const answer = deferred<SelectOutcome>();
        selects.push({ args: [bounty, id], answer });
        return answer.promise;
      },
    },
    detail: () => {
      const next = deferred<BountyDetail | 'gone'>();
      details.push(next);
      return next.promise;
    },
    now: () => new Date('2026-10-28T04:00:00.000Z'),
  });
  return { controller, lists, details, selects };
}

async function loaded(applicants = [applicant('jie'), applicant('hana')]) {
  const h = harness();
  const done = h.controller.load();
  h.lists[0].resolve(applicants);
  h.details[0].resolve(DETAIL);
  await done;
  return h;
}

describe('loading', () => {
  test('one load reads the list and the detail together', async () => {
    const h = await loaded();
    expect(h.lists).toHaveLength(1);
    expect(h.details).toHaveLength(1);
    const { select, detail } = h.controller.get();
    expect(select.list).toMatchObject({ kind: 'ready', loadedAt: '2026-10-28T04:00:00.000Z' });
    expect(detail).toEqual({ kind: 'ready', detail: DETAIL, refreshFailed: false });
  });

  test('triggers while a load is in flight join it instead of sending another', async () => {
    const h = harness();
    const first = h.controller.load();
    const second = h.controller.load();
    void h.controller.load();
    expect(h.lists).toHaveLength(1);
    expect(h.details).toHaveLength(1);
    h.lists[0].resolve([applicant('jie')]);
    h.details[0].resolve(DETAIL);
    await Promise.all([first, second]);
    expect(h.lists).toHaveLength(1);
    void h.controller.load();
    expect(h.lists).toHaveLength(2);
  });

  test('a failed first load is failed, never an empty list', async () => {
    const h = harness();
    const done = h.controller.load();
    h.lists[0].reject(new TypeError('Network request failed'));
    h.details[0].reject(new TypeError('Network request failed'));
    await done;
    expect(h.controller.get()).toEqual({
      select: expect.objectContaining({ list: { kind: 'failed', retrying: false } }),
      detail: { kind: 'failed' },
    });
  });

  test('a failed refresh keeps the rows and the detail', async () => {
    const h = await loaded();
    const done = h.controller.load();
    h.lists[1].reject(new TypeError('Network request failed'));
    h.details[1].reject(new TypeError('Network request failed'));
    await done;
    const { select, detail } = h.controller.get();
    expect(select.list).toMatchObject({ kind: 'ready', refreshFailed: true });
    expect(select.list.kind === 'ready' && select.list.applicants.map((row) => row.id)).toEqual([
      'jie',
      'hana',
    ]);
    expect(detail).toEqual({ kind: 'ready', detail: DETAIL, refreshFailed: true });
  });

  test('gone from either read is gone', async () => {
    const h = harness();
    const done = h.controller.load();
    h.lists[0].resolve('gone');
    h.details[0].resolve('gone');
    await done;
    expect(h.controller.get().select.list).toEqual({ kind: 'gone' });
    expect(h.controller.get().detail).toEqual({ kind: 'gone' });
  });
});

describe('select', () => {
  test('without a choice nothing is sent', async () => {
    const h = await loaded();
    await h.controller.select();
    expect(h.selects).toHaveLength(0);
  });

  test('sends the chosen applicant once, even if the hold completes twice', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const first = h.controller.select();
    const second = h.controller.select();
    await settle();
    expect(h.selects.map((call) => call.args)).toEqual([['b1', 'hana']]);
    expect(h.controller.get().select.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    h.selects[0].answer.resolve({ ok: true, helperId: 'hana' });
    await settle();
    h.lists[1].resolve([applicant('hana', { status: 'selected' })]);
    h.details[1].resolve({
      ...DETAIL,
      status: 'assigned',
      helper: { id: 'hana', name: 'hana', tier: 'reliable' },
    });
    await Promise.all([first, second]);
    expect(h.selects).toHaveLength(1);
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'hana' });
    expect(h.controller.get().detail).toMatchObject({ detail: { status: 'assigned' } });
  });

  test('a failure reloads, keeps the choice and is never replayed by a later trigger', async () => {
    const h = await loaded();
    h.controller.chose('jie');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.reject(new TypeError('Network request failed'));
    await settle();
    expect(h.controller.get().select.send).toEqual({ kind: 'sending', applicantId: 'jie' });
    expect(h.lists).toHaveLength(2);
    h.lists[1].resolve([applicant('jie'), applicant('hana')]);
    h.details[1].resolve(DETAIL);
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'failed', reason: 'failed' });
    expect(h.controller.get().select.chosen).toBe('jie');
    const again = h.controller.load();
    h.lists[2].resolve([applicant('jie'), applicant('hana')]);
    h.details[2].resolve(DETAIL);
    await again;
    expect(h.selects).toHaveLength(1);
    expect(h.controller.get().select.send).toEqual({ kind: 'failed', reason: 'failed' });
  });

  test('a select that committed but lost its answer reconciles to selected', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.reject(new TypeError('Network request failed'));
    await settle();
    h.lists[1].resolve([applicant('hana', { status: 'selected' })]);
    h.details[1].resolve({ ...DETAIL, status: 'assigned', helper: HANA });
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'hana' });
    expect(selectedHelper(h.controller.get())).toEqual(HANA);
    h.controller.chose('jie');
    await h.controller.select();
    expect(h.selects).toHaveLength(1);
  });

  test('a lost answer whose list reload failed reconciles from the detail', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.reject(new TypeError('Network request failed'));
    await settle();
    h.lists[1].reject(new TypeError('Network request failed'));
    h.details[1].resolve({ ...DETAIL, status: 'assigned', helper: HANA });
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'hana' });
  });

  test('opening an assigned bounty shows it as selected', async () => {
    const h = await loaded([applicant('hana', { status: 'selected' })]);
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'hana' });
    const viaDetail = harness();
    const done = viaDetail.controller.load();
    viaDetail.lists[0].reject(new TypeError('Network request failed'));
    viaDetail.details[0].resolve({ ...DETAIL, status: 'assigned', helper: HANA });
    await done;
    expect(viaDetail.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'hana' });
    expect(selectedHelper(viaDetail.controller.get())).toEqual(HANA);
  });

  test('notPending reloads the list after the in-flight load answers', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const refresh = h.controller.load();
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.resolve({ ok: false, reason: 'notPending' });
    await settle();
    expect(h.lists).toHaveLength(2);
    h.lists[1].resolve([applicant('jie'), applicant('hana')]);
    h.details[1].resolve(DETAIL);
    await settle();
    expect(h.lists).toHaveLength(3);
    h.lists[2].resolve([applicant('jie')]);
    h.details[2].resolve(DETAIL);
    await Promise.all([refresh, sent]);
    const { select } = h.controller.get();
    expect(select.send).toEqual({ kind: 'failed', reason: 'notPending' });
    expect(select.chosen).toBeNull();
    expect(select.list).toMatchObject({ applicants: [applicant('jie')] });
  });

  test('a lost race stays in flight until the reload names the winner', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.resolve({ ok: false, reason: 'taken' });
    await settle();
    expect(h.controller.get().select.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    h.lists[1].resolve([applicant('jie', { status: 'selected' })]);
    await settle();
    expect(h.controller.get().select.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    h.details[1].resolve({ ...DETAIL, status: 'assigned', helper: JIE });
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'raced', helper: JIE });
    h.controller.acknowledgeRace();
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'jie' });
  });

  test('a lost race whose detail failed takes the winner from the list', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.resolve({ ok: false, reason: 'taken' });
    await settle();
    h.lists[1].resolve([applicant('jie', { name: '阿杰', status: 'selected' })]);
    h.details[1].reject(new TypeError('Network request failed'));
    await sent;
    expect(h.controller.get().select.send).toEqual({
      kind: 'raced',
      helper: { id: 'jie', name: '阿杰', tier: 'reliable' },
    });
  });

  test('a lost race never names a helper from a read older than the answer', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const focus = h.controller.load();
    const sent = h.controller.select();
    await settle();
    h.lists[1].resolve([applicant('jie', { status: 'selected' })]);
    h.details[1].resolve({ ...DETAIL, status: 'assigned', helper: JIE });
    await focus;
    expect(h.controller.get().select.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    h.selects[0].answer.resolve({ ok: false, reason: 'taken' });
    await settle();
    h.lists[2].reject(new TypeError('Network request failed'));
    h.details[2].reject(new TypeError('Network request failed'));
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'raced', helper: null });
  });

  test('a lost race whose reload failed has no name, and the name stays pending until a load', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const sent = h.controller.select();
    await settle();
    h.selects[0].answer.resolve({ ok: false, reason: 'taken' });
    await settle();
    h.lists[1].reject(new TypeError('Network request failed'));
    h.details[1].reject(new TypeError('Network request failed'));
    await sent;
    expect(h.controller.get().select.send).toEqual({ kind: 'raced', helper: null });
    h.controller.acknowledgeRace();
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: null });
    expect(selectedHelper(h.controller.get())).toBeNull();
    const focus = h.controller.load();
    h.lists[2].resolve([applicant('jie', { status: 'selected' })]);
    h.details[2].resolve({ ...DETAIL, status: 'assigned', helper: JIE });
    await focus;
    expect(h.controller.get().select.send).toEqual({ kind: 'selected', helperId: 'jie' });
    expect(selectedHelper(h.controller.get())).toEqual({
      id: 'jie',
      name: 'jie',
      tier: 'reliable',
    });
  });

  test('blocked removes the row at once and reloads the list', async () => {
    const h = await loaded();
    h.controller.chose('hana');
    const done = h.controller.blocked('hana');
    expect(h.controller.get().select.chosen).toBeNull();
    expect(h.lists).toHaveLength(2);
    h.lists[1].resolve([applicant('jie')]);
    await done;
    expect(h.controller.get().select.list).toMatchObject({ applicants: [applicant('jie')] });
  });
});
