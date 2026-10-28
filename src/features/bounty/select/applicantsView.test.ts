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

  test('a send in flight is busy with the applicant being sent', () => {
    const shown = view({
      list: ready([JIE, HANA]),
      chosen: 'jie',
      send: { kind: 'sending', applicantId: 'jie' },
    });
    expect(shown.footer).toEqual({ state: 'busy', applicant: JIE, others: 1 });
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
      detail: { ...DETAIL, status: 'cancelled' },
      refreshFailed: false,
    } as const;
    const shown = view({ list: ready([JIE, HANA]), chosen: 'jie' }, closed);
    expect(shown.body).toBe('closed');
    expect(shown.applicants).toEqual([]);
    expect(shown.footer).toBeNull();
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
    expect(shown.body).toBe('list');
    expect(shown.footer).toBeNull();
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
