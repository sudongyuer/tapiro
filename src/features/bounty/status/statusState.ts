import type { StatusAction } from './timeline';
import type { ActionFailure, StatusDetail } from './types';

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; reason: 'failed' | 'unavailable'; retrying: boolean }
  | {
      kind: 'ready';
      detail: StatusDetail;
      loadedAt: string;
      refreshing: boolean;
      refreshFailed: boolean;
    };

export type ActionId = StatusAction | 'close' | 'cancelPreview';

export type ActionState =
  | { kind: 'idle' }
  | { kind: 'sending'; action: ActionId }
  | { kind: 'settling'; action: ActionId; after: number }
  | { kind: 'failed'; action: ActionId; reason: 'failed' | 'invalid' }
  | { kind: 'changed'; action: ActionId };

export type StatusState = { request: number; load: LoadState; action: ActionState };

export type StatusEvent =
  | { type: 'loadStarted'; request: number }
  | { type: 'loaded'; request: number; detail: StatusDetail; at: string }
  | { type: 'loadFailed'; request: number }
  | { type: 'unavailable'; request: number }
  | { type: 'actionStarted'; action: ActionId }
  | {
      type: 'actionAnswered';
      action: ActionId;
      outcome: { ok: true; quiet?: boolean } | { ok: false; reason: ActionFailure };
    }
  | { type: 'noticeDismissed' };

export const INITIAL_STATUS: StatusState = {
  request: 0,
  load: { kind: 'loading' },
  action: { kind: 'idle' },
};

const UNAVAILABLE: LoadState = { kind: 'failed', reason: 'unavailable', retrying: false };

export const actionLocked = (action: ActionState) =>
  action.kind === 'sending' || action.kind === 'settling';

export const inFlight = (state: StatusState, action: ActionId) =>
  actionLocked(state.action) && state.action.action === action;

function settled(action: ActionState, request: number): ActionState {
  return action.kind === 'settling' && request > action.after ? { kind: 'idle' } : action;
}

function started(load: LoadState): LoadState {
  if (load.kind === 'ready') return { ...load, refreshing: true };
  if (load.kind === 'failed') return { ...load, retrying: true };
  return load;
}

function failed(load: LoadState): LoadState {
  if (load.kind === 'ready') return { ...load, refreshing: false, refreshFailed: true };
  return { kind: 'failed', reason: 'failed', retrying: false };
}

function answered(
  state: StatusState,
  action: ActionId,
  outcome: Extract<StatusEvent, { type: 'actionAnswered' }>['outcome'],
): StatusState {
  if (outcome.ok) {
    if (outcome.quiet) return { ...state, action: { kind: 'idle' } };
    return { ...state, action: { kind: 'settling', action, after: state.request } };
  }
  switch (outcome.reason) {
    case 'changed':
      return { ...state, action: { kind: 'changed', action } };
    case 'unavailable':
      return { ...state, load: UNAVAILABLE, action: { kind: 'idle' } };
    case 'invalid':
    case 'failed':
      return { ...state, action: { kind: 'failed', action, reason: outcome.reason } };
  }
}

export function statusReducer(state: StatusState, event: StatusEvent): StatusState {
  switch (event.type) {
    case 'loadStarted':
      if (event.request <= state.request) return state;
      return { ...state, request: event.request, load: started(state.load) };
    case 'loaded':
      if (event.request !== state.request) return state;
      return {
        ...state,
        load: {
          kind: 'ready',
          detail: event.detail,
          loadedAt: event.at,
          refreshing: false,
          refreshFailed: false,
        },
        action: settled(state.action, event.request),
      };
    case 'loadFailed':
      if (event.request !== state.request) return state;
      return { ...state, load: failed(state.load), action: settled(state.action, event.request) };
    case 'unavailable':
      if (event.request !== state.request) return state;
      return { ...state, load: UNAVAILABLE, action: { kind: 'idle' } };
    case 'actionStarted':
      if (state.load.kind !== 'ready' || actionLocked(state.action)) return state;
      return { ...state, action: { kind: 'sending', action: event.action } };
    case 'actionAnswered':
      if (state.action.kind !== 'sending' || state.action.action !== event.action) return state;
      return answered(state, event.action, event.outcome);
    case 'noticeDismissed':
      if (state.action.kind !== 'failed' && state.action.kind !== 'changed') return state;
      return { ...state, action: { kind: 'idle' } };
  }
}

export const shownDetail = (state: StatusState): StatusDetail | null =>
  state.load.kind === 'ready' ? state.load.detail : null;
