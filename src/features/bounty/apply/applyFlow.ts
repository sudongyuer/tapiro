import type { BoardService } from '../board/types';
import type { BountyCache } from '../shared/bountyCache';
import type { ApplySurface, createJustApplied } from '../shared/justApplied';
import {
  applyReducer,
  canSend,
  INITIAL_APPLY,
  noteToSend,
  withdrawReducer,
  type ApplyEvent,
  type ApplyState,
  type WithdrawState,
} from './applyState';
import type { createNoteDrafts } from './noteDrafts';

type Deps = {
  service: Pick<BoardService, 'hasPayeeMethod' | 'apply'>;
  cache: Pick<BountyCache, 'markApplied'>;
  justApplied: Pick<ReturnType<typeof createJustApplied>, 'set'>;
  drafts: ReturnType<typeof createNoteDrafts>;
};

export function createApplyFlow(id: string, surface: ApplySurface, deps: Deps) {
  let state: ApplyState = INITIAL_APPLY;
  const listeners = new Set<() => void>();

  function dispatch(event: ApplyEvent) {
    const next = applyReducer(state, event);
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async check() {
      let hasPayee = true;
      try {
        hasPayee = await deps.service.hasPayeeMethod();
      } catch {}
      dispatch({ type: 'checked', hasPayee });
    },
    async send() {
      if (!canSend(state)) return;
      dispatch({ type: 'sendStarted' });
      const answer = await deps.service
        .apply(id, noteToSend(deps.drafts.get(id)))
        .catch(() => ({ ok: false as const, reason: 'failed' as const }));
      if (answer.ok) {
        deps.drafts.set(id, '');
        deps.justApplied.set(id, surface);
        deps.cache.markApplied(id, answer.note);
      }
      dispatch({ type: 'answered', answer });
    },
  };
}

export type ApplyFlow = ReturnType<typeof createApplyFlow>;

type WithdrawDeps = {
  service: Pick<BoardService, 'withdraw'>;
  cache: Pick<BountyCache, 'markWithdrawn'>;
  reload: () => void;
};

export function createWithdrawFlow(id: string, deps: WithdrawDeps) {
  let state: WithdrawState = { kind: 'idle' };
  const listeners = new Set<() => void>();

  function set(next: WithdrawState) {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async withdraw() {
      if (state.kind === 'busy') return;
      set(withdrawReducer(state, { type: 'started' }));
      const answer = await deps.service
        .withdraw(id)
        .catch(() => ({ ok: false as const, reason: 'failed' as const }));
      if (answer.ok) deps.cache.markWithdrawn(id);
      else if (answer.reason === 'notPending') deps.reload();
      set(withdrawReducer(state, { type: 'answered', answer }));
    },
  };
}

export type WithdrawFlow = ReturnType<typeof createWithdrawFlow>;
