import type { Applicant, SelectFailure, SelectOutcome } from './types';

export type ListState =
  | { kind: 'loading' }
  | { kind: 'failed'; retrying: boolean }
  | {
      kind: 'ready';
      applicants: Applicant[];
      loadedAt: string;
      refreshing: boolean;
      refreshFailed: boolean;
    }
  | { kind: 'gone' };

export type SendFailure = Exclude<SelectFailure, 'taken'>;

export type SendState =
  | { kind: 'idle' }
  | { kind: 'sending'; applicantId: string }
  | { kind: 'failed'; reason: SendFailure }
  | { kind: 'raced' }
  | { kind: 'selected'; helperId: string | null };

export type SelectState = {
  request: number;
  list: ListState;
  chosen: string | null;
  send: SendState;
};

export type SelectEvent =
  | { type: 'loadStarted'; request: number }
  | { type: 'loaded'; request: number; applicants: Applicant[]; at: string }
  | { type: 'loadFailed'; request: number }
  | { type: 'gone'; request: number }
  | { type: 'chose'; id: string }
  | { type: 'holdCompleted' }
  | { type: 'answered'; outcome: SelectOutcome }
  | { type: 'blocked'; id: string }
  | { type: 'raceAcknowledged'; helperId: string | null };

export const INITIAL_SELECT: SelectState = {
  request: 0,
  list: { kind: 'loading' },
  chosen: null,
  send: { kind: 'idle' },
};

const listed = (list: ListState, id: string) =>
  list.kind === 'ready' && list.applicants.some((applicant) => applicant.id === id);

const locked = (send: SendState) =>
  send.kind === 'sending' || send.kind === 'raced' || send.kind === 'selected';

function started(list: ListState): ListState {
  if (list.kind === 'ready') return { ...list, refreshing: true };
  if (list.kind === 'failed') return { kind: 'failed', retrying: true };
  return list;
}

function failed(list: ListState): ListState {
  if (list.kind === 'ready') return { ...list, refreshing: false, refreshFailed: true };
  if (list.kind === 'gone') return list;
  return { kind: 'failed', retrying: false };
}

export function selectReducer(state: SelectState, event: SelectEvent): SelectState {
  switch (event.type) {
    case 'loadStarted':
      if (event.request <= state.request) return state;
      return { ...state, request: event.request, list: started(state.list) };
    case 'loaded': {
      if (event.request !== state.request) return state;
      const list: ListState = {
        kind: 'ready',
        applicants: event.applicants,
        loadedAt: event.at,
        refreshing: false,
        refreshFailed: false,
      };
      const kept = state.chosen !== null && listed(list, state.chosen);
      return { ...state, list, chosen: kept ? state.chosen : null };
    }
    case 'loadFailed':
      if (event.request !== state.request) return state;
      return { ...state, list: failed(state.list) };
    case 'gone':
      if (event.request !== state.request) return state;
      return { ...state, list: { kind: 'gone' }, chosen: null };
    case 'chose':
      if (locked(state.send) || state.chosen === event.id || !listed(state.list, event.id)) {
        return state;
      }
      return {
        ...state,
        chosen: event.id,
        send: state.send.kind === 'failed' ? { kind: 'idle' } : state.send,
      };
    case 'holdCompleted':
      if (state.chosen === null || locked(state.send)) return state;
      return { ...state, send: { kind: 'sending', applicantId: state.chosen } };
    case 'answered': {
      if (state.send.kind !== 'sending') return state;
      const { outcome } = event;
      if (outcome.ok) return { ...state, send: { kind: 'selected', helperId: outcome.helperId } };
      if (outcome.reason === 'taken') return { ...state, send: { kind: 'raced' } };
      return { ...state, send: { kind: 'failed', reason: outcome.reason } };
    }
    case 'blocked': {
      const chosen = state.chosen === event.id ? null : state.chosen;
      if (state.list.kind !== 'ready')
        return chosen === state.chosen ? state : { ...state, chosen };
      const applicants = state.list.applicants.filter((applicant) => applicant.id !== event.id);
      if (applicants.length === state.list.applicants.length && chosen === state.chosen) {
        return state;
      }
      return { ...state, list: { ...state.list, applicants }, chosen };
    }
    case 'raceAcknowledged':
      if (state.send.kind !== 'raced') return state;
      return { ...state, send: { kind: 'selected', helperId: event.helperId } };
  }
}

export type StatusLine =
  | { key: 'bounty.select.statusOpen'; count: number }
  | { key: 'bounty.select.statusOpenNoCount' }
  | { key: 'bounty.select.statusEmpty' };

export function statusLine(list: ListState): StatusLine {
  if (list.kind !== 'ready') return { key: 'bounty.select.statusOpenNoCount' };
  const count = list.applicants.length;
  return count === 0
    ? { key: 'bounty.select.statusEmpty' }
    : { key: 'bounty.select.statusOpen', count };
}
