import { describe, expect, test } from 'bun:test';

import {
  INITIAL_SELECT,
  selectReducer,
  statusLine,
  type SelectEvent,
  type SelectState,
} from './selectState';
import type { Applicant } from './types';

const applicant = (id: string, patch: Partial<Applicant> = {}): Applicant => ({
  id,
  name: id.toUpperCase(),
  tier: 'reliable',
  note: null,
  status: 'pending',
  appliedAt: '2026-10-28T03:00:00.000Z',
  helpedCount: 0,
  ...patch,
});

const JIE = applicant('jie');
const HANA = applicant('hana');
const AIMAN = applicant('aiman');

const run = (state: SelectState, ...events: SelectEvent[]) => events.reduce(selectReducer, state);

const ready = (...applicants: Applicant[]) =>
  run(
    INITIAL_SELECT,
    { type: 'loadStarted', request: 1 },
    { type: 'loaded', request: 1, applicants, at: '10:00' },
  );

const chosen = (id: string) => run(ready(JIE, HANA, AIMAN), { type: 'chose', id });

const sending = (id = 'jie') => run(chosen(id), { type: 'holdCompleted' });

describe('the list', () => {
  test('a failed first load has no applicants and the status line has no count', () => {
    const failed = run(
      INITIAL_SELECT,
      { type: 'loadStarted', request: 1 },
      { type: 'loadFailed', request: 1 },
    );
    expect(failed.list).toEqual({ kind: 'failed', retrying: false });
    expect(statusLine(failed.list)).toEqual({ key: 'bounty.select.statusOpenNoCount' });
    expect(statusLine(INITIAL_SELECT.list)).toEqual({ key: 'bounty.select.statusOpenNoCount' });
    expect(run(failed, { type: 'loadStarted', request: 2 }).list).toEqual({
      kind: 'failed',
      retrying: true,
    });
  });

  test('a loaded list counts its applicants; an empty one reads as empty', () => {
    expect(statusLine(ready(JIE, HANA).list)).toEqual({
      key: 'bounty.select.statusOpen',
      count: 2,
    });
    expect(statusLine(ready().list)).toEqual({ key: 'bounty.select.statusEmpty' });
  });

  test('a failed refresh keeps the rows and the old loadedAt', () => {
    const shown = ready(JIE, HANA);
    const refreshing = run(shown, { type: 'loadStarted', request: 2 });
    expect(refreshing.list).toMatchObject({ kind: 'ready', refreshing: true });
    const stale = run(refreshing, { type: 'loadFailed', request: 2 });
    expect(stale.list).toEqual({
      kind: 'ready',
      applicants: [JIE, HANA],
      loadedAt: '10:00',
      refreshing: false,
      refreshFailed: true,
    });
    const fresh = run(
      stale,
      { type: 'loadStarted', request: 3 },
      {
        type: 'loaded',
        request: 3,
        applicants: [HANA],
        at: '10:05',
      },
    );
    expect(fresh.list).toEqual({
      kind: 'ready',
      applicants: [HANA],
      loadedAt: '10:05',
      refreshing: false,
      refreshFailed: false,
    });
  });

  test('an answer for an older request is dropped', () => {
    const state = run(
      INITIAL_SELECT,
      { type: 'loadStarted', request: 1 },
      { type: 'loadStarted', request: 2 },
      { type: 'loaded', request: 1, applicants: [JIE], at: '10:00' },
    );
    expect(state.list).toEqual({ kind: 'loading' });
    expect(run(state, { type: 'loadFailed', request: 1 }).list).toEqual({ kind: 'loading' });
    expect(run(state, { type: 'gone', request: 1 }).list).toEqual({ kind: 'loading' });
    expect(
      run(state, { type: 'loaded', request: 2, applicants: [HANA], at: '10:01' }).list,
    ).toMatchObject({ kind: 'ready', applicants: [HANA] });
    expect(run(ready(JIE), { type: 'loadStarted', request: 1 }).list).toMatchObject({
      refreshing: false,
    });
  });

  test('gone clears the list and the choice', () => {
    const state = run(
      chosen('hana'),
      { type: 'loadStarted', request: 2 },
      { type: 'gone', request: 2 },
    );
    expect(state.list).toEqual({ kind: 'gone' });
    expect(state.chosen).toBeNull();
  });
});

describe('choosing', () => {
  test('chose puts the check on one row and moves it', () => {
    expect(chosen('hana').chosen).toBe('hana');
    expect(run(chosen('hana'), { type: 'chose', id: 'jie' }).chosen).toBe('jie');
  });

  test('a row that is not listed cannot be chosen', () => {
    expect(run(ready(JIE), { type: 'chose', id: 'hana' }).chosen).toBeNull();
    expect(run(INITIAL_SELECT, { type: 'chose', id: 'jie' }).chosen).toBeNull();
  });

  test('a reload keeps the choice while the row is listed and clears it when it is not', () => {
    const kept = run(
      chosen('hana'),
      { type: 'loadStarted', request: 2 },
      {
        type: 'loaded',
        request: 2,
        applicants: [HANA, AIMAN],
        at: '10:05',
      },
    );
    expect(kept.chosen).toBe('hana');
    const dropped = run(
      kept,
      { type: 'loadStarted', request: 3 },
      {
        type: 'loaded',
        request: 3,
        applicants: [JIE, AIMAN],
        at: '10:06',
      },
    );
    expect(dropped.chosen).toBeNull();
  });

  test('blocked removes the row and clears the check only when it was chosen', () => {
    const other = run(chosen('jie'), { type: 'blocked', id: 'hana', request: 9 });
    expect(other.list).toMatchObject({ applicants: [JIE, AIMAN] });
    expect(other.chosen).toBe('jie');
    const same = run(chosen('hana'), { type: 'blocked', id: 'hana', request: 9 });
    expect(same.list).toMatchObject({ applicants: [JIE, AIMAN] });
    expect(same.chosen).toBeNull();
  });

  test('a list answer requested before the block is dropped', () => {
    const refreshing = run(ready(JIE, HANA, AIMAN), { type: 'loadStarted', request: 2 });
    const blocked = run(refreshing, { type: 'blocked', id: 'hana', request: 3 });
    const stale = run(blocked, {
      type: 'loaded',
      request: 2,
      applicants: [JIE, HANA, AIMAN],
      at: '10:05',
    });
    expect(stale.list).toMatchObject({ applicants: [JIE, AIMAN], loadedAt: '10:00' });
    const next = run(
      stale,
      { type: 'loadStarted', request: 4 },
      {
        type: 'loaded',
        request: 4,
        applicants: [JIE],
        at: '10:06',
      },
    );
    expect(next.list).toMatchObject({ applicants: [JIE], loadedAt: '10:06' });
  });
});

describe('sending', () => {
  test('holdCompleted without a choice is ignored', () => {
    const state = ready(JIE);
    expect(run(state, { type: 'holdCompleted' })).toBe(state);
  });

  test('holdCompleted sends the chosen row once', () => {
    const first = sending('hana');
    expect(first.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    expect(run(first, { type: 'holdCompleted' })).toBe(first);
  });

  test('the choice cannot move while sending', () => {
    expect(run(sending('hana'), { type: 'chose', id: 'jie' }).chosen).toBe('hana');
  });

  test('ok is selected', () => {
    expect(
      run(sending(), { type: 'answered', outcome: { ok: true, helperId: 'jie' } }).send,
    ).toEqual({ kind: 'selected', helperId: 'jie' });
  });

  test('an answer without a send in flight is ignored', () => {
    const state = chosen('jie');
    expect(run(state, { type: 'answered', outcome: { ok: true, helperId: 'jie' } })).toBe(state);
  });

  test('taken is a lost race naming the winner; acknowledging it shows that helper', () => {
    const winner = { id: 'aiman', name: 'Aiman', tier: 'reliable' } as const;
    const raced = run(sending(), {
      type: 'answered',
      outcome: { ok: false, reason: 'taken' },
      winner,
    });
    expect(raced.send).toEqual({ kind: 'raced', helper: winner });
    expect(run(raced, { type: 'holdCompleted' })).toBe(raced);
    expect(run(raced, { type: 'helperKnown', helperId: 'jie' })).toBe(raced);
    expect(run(raced, { type: 'raceAcknowledged' }).send).toEqual({
      kind: 'selected',
      helperId: 'aiman',
    });
    expect(run(chosen('jie'), { type: 'raceAcknowledged' }).send).toEqual({ kind: 'idle' });
  });

  test('a race without a known winner stays selected with the name pending until a load names it', () => {
    const raced = run(sending(), { type: 'answered', outcome: { ok: false, reason: 'taken' } });
    expect(raced.send).toEqual({ kind: 'raced', helper: null });
    const pending = run(raced, { type: 'raceAcknowledged' });
    expect(pending.send).toEqual({ kind: 'selected', helperId: null });
    const named = run(
      pending,
      { type: 'loadStarted', request: 2 },
      {
        type: 'loaded',
        request: 2,
        applicants: [applicant('aiman', { status: 'selected' })],
        at: '10:05',
      },
    );
    expect(named.send).toEqual({ kind: 'selected', helperId: 'aiman' });
    expect(run(pending, { type: 'helperKnown', helperId: 'aiman' }).send).toEqual({
      kind: 'selected',
      helperId: 'aiman',
    });
  });

  test.each(['failed', 'closed', 'notPending', 'noPayee'] as const)(
    '%s fails and keeps the choice',
    (reason) => {
      const state = run(sending('hana'), { type: 'answered', outcome: { ok: false, reason } });
      expect(state.send).toEqual({ kind: 'failed', reason });
      expect(state.chosen).toBe('hana');
      expect(state.list.kind).toBe('ready');
    },
  );

  test('gone closes the list so it cannot be held again', () => {
    const state = run(sending('hana'), {
      type: 'answered',
      outcome: { ok: false, reason: 'gone' },
    });
    expect(state.send).toEqual({ kind: 'failed', reason: 'gone' });
    expect(state.list).toEqual({ kind: 'gone' });
    expect(run(state, { type: 'holdCompleted' })).toBe(state);
  });

  test('a list that already shows a selected helper becomes selected, never a race', () => {
    const relaunch = ready(applicant('hana', { status: 'selected' }));
    expect(relaunch.send).toEqual({ kind: 'selected', helperId: 'hana' });
    const failed = run(sending('hana'), {
      type: 'answered',
      outcome: { ok: false, reason: 'failed' },
    });
    const reconciled = run(
      failed,
      { type: 'loadStarted', request: 2 },
      {
        type: 'loaded',
        request: 2,
        applicants: [applicant('hana', { status: 'selected' })],
        at: '10:05',
      },
    );
    expect(reconciled.send).toEqual({ kind: 'selected', helperId: 'hana' });
  });

  test('a load answering while the send is in flight does not decide it', () => {
    const state = run(
      sending('hana'),
      { type: 'loadStarted', request: 2 },
      {
        type: 'loaded',
        request: 2,
        applicants: [applicant('jie', { status: 'selected' })],
        at: '10:05',
      },
    );
    expect(state.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    expect(run(state, { type: 'helperKnown', helperId: 'jie' }).send).toEqual({
      kind: 'sending',
      applicantId: 'hana',
    });
  });

  test('a known helper settles an idle or failed send', () => {
    expect(run(ready(JIE), { type: 'helperKnown', helperId: 'jie' }).send).toEqual({
      kind: 'selected',
      helperId: 'jie',
    });
    const selected = run(sending('hana'), {
      type: 'answered',
      outcome: { ok: true, helperId: 'hana' },
    });
    expect(run(selected, { type: 'helperKnown', helperId: 'jie' })).toBe(selected);
  });

  test('after a failure the user can hold again; choosing another row clears the notice', () => {
    const failed = run(sending('hana'), {
      type: 'answered',
      outcome: { ok: false, reason: 'failed' },
    });
    expect(run(failed, { type: 'holdCompleted' }).send).toEqual({
      kind: 'sending',
      applicantId: 'hana',
    });
    expect(run(failed, { type: 'chose', id: 'jie' }).send).toEqual({ kind: 'idle' });
  });
});

describe('a block and a send meeting', () => {
  test('a row removed by a confirmed block can never be sent', () => {
    const after = run(
      chosen('hana'),
      { type: 'blocked', id: 'hana', request: 9 },
      { type: 'holdCompleted' },
    );
    expect(after.chosen).toBeNull();
    expect(after.send).toEqual({ kind: 'idle' });
    const again = run(after, { type: 'chose', id: 'hana' });
    expect(again.chosen).toBeNull();
  });

  test('a block confirmed while a send is in flight leaves the send untouched', () => {
    const during = run(sending('hana'), { type: 'blocked', id: 'hana', request: 9 });
    expect(during.send).toEqual({ kind: 'sending', applicantId: 'hana' });
    const answered = run(during, { type: 'answered', outcome: { ok: true, helperId: 'hana' } });
    expect(answered.send).toEqual({ kind: 'selected', helperId: 'hana' });
  });

  test('a block confirmed for another row during a send keeps the chosen row', () => {
    const during = run(sending('jie'), { type: 'blocked', id: 'aiman', request: 9 });
    expect(during.send).toEqual({ kind: 'sending', applicantId: 'jie' });
    expect(during.chosen).toBe('jie');
  });
});
