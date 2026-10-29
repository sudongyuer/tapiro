import { describe, expect, test } from 'bun:test';

import type { BountyDetail } from '../board/types';
import type { ApplicantsSnapshot, DetailLoad } from './applicantsController';
import { applicantsView, closedForChoosing } from './applicantsView';
import { INITIAL_SELECT, type ListState, type SelectState } from './selectState';
import type { Applicant } from './types';

const NOW = new Date('2026-10-28T04:00:00.000Z');

const applicant = (id: string): Applicant => ({
  id,
  name: id,
  tier: 'reliable',
  note: null,
  status: 'pending',
  appliedAt: '2026-10-28T03:00:00.000Z',
  helpedCount: 0,
});

const JIE = applicant('jie');
const HANA = applicant('hana');
const AIMAN = applicant('aiman');

const DETAIL: BountyDetail = {
  id: 'b1',
  title: '帮取快递',
  description: null,
  category: 'pickup',
  reward: { minor: 800, currency: 'MYR' },
  reference: null,
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

const ready = (
  applicants: Applicant[],
  patch: Partial<Extract<ListState, { kind: 'ready' }>> = {},
) =>
  ({
    kind: 'ready',
    applicants,
    loadedAt: '2026-10-28T03:30:00.000Z',
    refreshing: false,
    refreshFailed: false,
    ...patch,
  }) as const;

const snapshot = (
  select: Partial<SelectState>,
  detail: DetailLoad = { kind: 'ready', detail: DETAIL, refreshFailed: false },
): ApplicantsSnapshot => ({ select: { ...INITIAL_SELECT, ...select }, detail });

const view = (select: Partial<SelectState>, detail?: DetailLoad) =>
  applicantsView(snapshot(select, detail), NOW);

describe('applicantsView', () => {
  test('three applicants and no choice: the button waits for a choice and counts the other two', () => {
    const shown = view({ list: ready([JIE, HANA, AIMAN]) });
    expect(shown.body).toBe('list');
    expect(shown.applicants.map((a) => a.id)).toEqual(['jie', 'hana', 'aiman']);
    expect(shown.footer).toEqual({ state: 'disabled', others: 2 });
  });

  test('a choice names that applicant on the button', () => {
    expect(view({ list: ready([JIE, HANA, AIMAN]), chosen: 'hana' }).footer).toEqual({
      state: 'ready',
      applicant: HANA,
      others: 2,
    });
  });

  test('a send in flight is busy', () => {
    const shown = view({
      list: ready([JIE, HANA]),
      chosen: 'jie',
      send: { kind: 'sending', applicantId: 'jie' },
    });
    expect(shown.footer).toEqual({ state: 'busy', others: 1 });
    expect(shown.notice).toBeNull();
  });

  test('a send stays busy while a reload drops the applicant being sent', () => {
    const shown = view({ list: ready([HANA]), send: { kind: 'sending', applicantId: 'jie' } });
    expect(shown.footer).toEqual({ state: 'busy', others: 0 });
  });

  test('a lost race keeps the button busy behind the alert', () => {
    const shown = view({
      list: ready([{ ...JIE, status: 'selected' }]),
      send: { kind: 'raced', helper: { id: 'jie', name: '阿杰', tier: 'reliable' } },
    });
    expect(shown.body).toBe('list');
    expect(shown.footer).toEqual({ state: 'busy', others: 0 });
  });

  test('a failed send shows its notice above the button', () => {
    for (const reason of ['failed', 'notPending', 'noPayee'] as const) {
      const shown = view({
        list: ready([JIE, HANA]),
        chosen: 'jie',
        send: { kind: 'failed', reason },
      });
      expect(shown.notice).toBe(reason);
    }
  });

  test('notPending that empties the list still shows its notice', () => {
    const shown = view({ list: ready([]), send: { kind: 'failed', reason: 'notPending' } });
    expect(shown.body).toBe('empty');
    expect(shown.notice).toBe('notPending');
  });

  test('closed answered by the server shows the closed state even if the detail still reads open', () => {
    const shown = view({
      list: ready([JIE]),
      chosen: 'jie',
      send: { kind: 'failed', reason: 'closed' },
    });
    expect(shown.body).toBe('closed');
    expect(shown.footer).toBeNull();
    expect(shown.notice).toBeNull();
  });

  test('a failed send keeps the chosen applicant ready to hold again', () => {
    const shown = view({
      list: ready([JIE, HANA]),
      chosen: 'jie',
      send: { kind: 'failed', reason: 'failed' },
    });
    expect(shown.footer).toEqual({ state: 'ready', applicant: JIE, others: 1 });
  });

  test('no applicants: the empty card and no button', () => {
    const shown = view({ list: ready([]) });
    expect(shown.body).toBe('empty');
    expect(shown.footer).toBeNull();
  });

  test('a failed first load is a failure, never empty, and has no button', () => {
    const shown = view({ list: { kind: 'failed', retrying: false } });
    expect(shown.body).toBe('failed');
    expect(shown.footer).toBeNull();
  });

  test('loading shows no button', () => {
    const shown = view({ list: { kind: 'loading' } });
    expect(shown.body).toBe('loading');
    expect(shown.footer).toBeNull();
  });

  test('a failed refresh keeps the rows and reports the time of the data', () => {
    const shown = view({ list: ready([JIE], { refreshFailed: true, refreshing: true }) });
    expect(shown.body).toBe('list');
    expect(shown.applicants).toEqual([JIE]);
    expect(shown.stale).toEqual({ loadedAt: '2026-10-28T03:30:00.000Z', refreshing: true });
  });

  test('a current list has no stale notice', () => {
    expect(view({ list: ready([JIE]) }).stale).toBeNull();
  });

  test('a gone list or detail shows the gone state', () => {
    expect(view({ list: { kind: 'gone' } }).body).toBe('gone');
    expect(view({ list: ready([JIE]) }, { kind: 'gone' }).body).toBe('gone');
  });

  test('a closed bounty shows the closed card instead of the rows and the button', () => {
    const closed = {
      kind: 'ready',
      detail: { ...DETAIL, status: 'closed' },
      refreshFailed: false,
    } as const;
    const shown = view({ list: ready([JIE, HANA]), chosen: 'jie' }, closed);
    expect(shown.body).toBe('closed');
    expect(shown.applicants).toEqual([]);
    expect(shown.footer).toBeNull();
  });

  test('a selection shows the after-selection state without the list, button or stale notice', () => {
    const shown = view({
      list: ready([{ ...JIE, status: 'selected' }], { refreshFailed: true }),
      send: { kind: 'selected', helperId: 'jie' },
    });
    expect(shown.body).toBe('done');
    expect(shown.applicants).toEqual([]);
    expect(shown.footer).toBeNull();
    expect(shown.stale).toBeNull();
  });

  test('an assigned bounty is not closed: it moves to the after-selection state', () => {
    const assigned = {
      kind: 'ready',
      detail: { ...DETAIL, status: 'assigned' },
      refreshFailed: false,
    } as const;
    const shown = view(
      {
        list: ready([{ ...JIE, status: 'selected' }]),
        send: { kind: 'selected', helperId: 'jie' },
      },
      assigned,
    );
    expect(shown.body).toBe('done');
    expect(shown.footer).toBeNull();
  });

  const selected = {
    list: ready([{ ...JIE, status: 'selected' as const }]),
    send: { kind: 'selected', helperId: 'jie' } as const,
  };
  const at = (status: string): DetailLoad => ({
    kind: 'ready',
    detail: { ...DETAIL, status, helper: { id: 'jie', name: 'jie', tier: 'reliable' } },
    refreshFailed: false,
  });

  test.each(['assigned', 'en_route', 'done', 'disputed', 'confirmed', 'settled'])(
    '%s keeps 选好了 and offers 看进度',
    (status) => {
      const shown = view(selected, at(status));
      expect(shown.body).toBe('done');
      expect(shown.progress).toBe(true);
    },
  );

  test('cancelled after selection drops 选好了 and still offers 看进度', () => {
    const shown = view(selected, at('cancelled'));
    expect(shown.body).toBe('cancelled');
    expect(shown.footer).toBeNull();
    expect(shown.progress).toBe(true);
  });

  test('a selection made here waits for the detail before offering 看进度', () => {
    expect(view(selected, { kind: 'loading' })).toMatchObject({ body: 'done', progress: false });
    expect(view(selected)).toMatchObject({ body: 'done', progress: false });
  });

  test('an open bounty offers no 看进度', () => {
    expect(view({ list: ready([JIE]) }).progress).toBe(false);
  });

  test('a failed detail does not hide a loaded list', () => {
    expect(view({ list: ready([JIE]) }, { kind: 'failed' }).body).toBe('list');
  });
});

describe('closedForChoosing', () => {
  test('closed and cancelled bounties are closed', () => {
    expect(closedForChoosing({ ...DETAIL, status: 'closed' }, NOW)).toBe(true);
    expect(closedForChoosing({ ...DETAIL, status: 'cancelled' }, NOW)).toBe(true);
  });

  test('an open bounty past its expiry is closed', () => {
    expect(closedForChoosing({ ...DETAIL, expiresAt: '2026-10-28T04:00:00.000Z' }, NOW)).toBe(true);
    expect(closedForChoosing(DETAIL, NOW)).toBe(false);
  });

  test('a bounty with a helper is not closed for this screen', () => {
    expect(closedForChoosing({ ...DETAIL, status: 'assigned' }, NOW)).toBe(false);
  });
});
