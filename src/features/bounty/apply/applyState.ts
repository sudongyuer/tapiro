import type { ApplyOutcome } from '../board/types';
import { codePoints } from '../post/validate';

export const NOTE_MAX = 140;

export type ApplyReason = 'failed' | 'closed' | 'taken' | 'gone' | 'own';

export type ApplyState =
  | { kind: 'checking' }
  | { kind: 'noPayee' }
  | { kind: 'form'; sending: boolean; reason: ApplyReason | null }
  | { kind: 'sent'; note: string | null };

export type ApplyEvent =
  | { type: 'checked'; hasPayee: boolean }
  | { type: 'sendStarted' }
  | { type: 'answered'; answer: ApplyOutcome };

export const INITIAL_APPLY: ApplyState = { kind: 'checking' };

const FINAL: readonly ApplyReason[] = ['closed', 'taken', 'gone', 'own'];

export function canSend(state: ApplyState) {
  return (
    state.kind === 'form' &&
    !state.sending &&
    (state.reason === null || !FINAL.includes(state.reason))
  );
}

export function applyReducer(state: ApplyState, event: ApplyEvent): ApplyState {
  switch (event.type) {
    case 'checked':
      if (state.kind !== 'checking') return state;
      return event.hasPayee ? { kind: 'form', sending: false, reason: null } : { kind: 'noPayee' };
    case 'sendStarted':
      return canSend(state) ? { kind: 'form', sending: true, reason: null } : state;
    case 'answered': {
      if (state.kind !== 'form' || !state.sending) return state;
      const { answer } = event;
      if (answer.ok) return { kind: 'sent', note: answer.note };
      if (answer.reason === 'noPayee') return { kind: 'noPayee' };
      return { kind: 'form', sending: false, reason: answer.reason };
    }
  }
}

export function noteToSend(text: string) {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

export const noteCount = (text: string) => codePoints(text.trim());

export type WithdrawState = { kind: 'idle' | 'busy' | 'failed' };

export type WithdrawEvent =
  | { type: 'started' }
  | { type: 'answered'; answer: { ok: true } | { ok: false; reason: 'notPending' | 'failed' } };

export function withdrawReducer(state: WithdrawState, event: WithdrawEvent): WithdrawState {
  if (event.type === 'started') return state.kind === 'busy' ? state : { kind: 'busy' };
  if (state.kind !== 'busy') return state;
  return event.answer.ok || event.answer.reason === 'notPending'
    ? { kind: 'idle' }
    : { kind: 'failed' };
}
