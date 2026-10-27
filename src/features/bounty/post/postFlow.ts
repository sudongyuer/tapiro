import { createInFlightGuard } from '@/lib/inFlightGuard';
import { createStore } from '@/lib/store';

import { costLine } from './cost';
import type { DraftError, PostDraft, PostService, PostStatus, PublishFailure } from './types';
import { checkDraft } from './validate';

export type StatusState =
  { kind: 'loading' } | { kind: 'ready'; status: PostStatus } | { kind: 'failed' };

export type FlowState = {
  status: StatusState;
  busy: boolean;
  rejected: Exclude<PublishFailure, 'blocked' | 'noBalance'> | null;
};

export type FlowDeps = {
  service: PostService;
  draft: () => PostDraft;
  clearDraft: () => void;
  now: () => Date;
};

export type PublishHandlers = {
  onPublished: () => void;
  onInvalid: (error: DraftError) => void;
};

const INITIAL: FlowState = { status: { kind: 'loading' }, busy: false, rejected: null };

export function canPublish(state: FlowState) {
  if (state.busy || state.status.kind !== 'ready') return false;
  const cost = costLine(state.status.status).kind;
  return cost === 'free' || cost === 'coin';
}

export function createPostFlow(deps: FlowDeps) {
  const store = createStore<FlowState>(INITIAL);
  const guard = createInFlightGuard();
  const patch = (next: Partial<FlowState>) => store.set({ ...store.get(), ...next });

  async function load() {
    patch({ status: { kind: 'loading' } });
    try {
      patch({ status: { kind: 'ready', status: await deps.service.status() } });
    } catch {
      patch({ status: { kind: 'failed' } });
    }
  }

  function publish(handlers: PublishHandlers) {
    return guard(async () => {
      if (!canPublish(store.get())) return;
      const checked = checkDraft(deps.draft(), deps.now());
      if (!checked.ok) return handlers.onInvalid(checked.error);
      patch({ busy: true, rejected: null });
      const outcome = await deps.service.publish(checked.args);
      if (outcome.ok) {
        deps.clearDraft();
        patch({ busy: false });
        handlers.onPublished();
        return;
      }
      const { reason } = outcome;
      if (reason === 'blocked' || reason === 'noBalance') {
        patch({ busy: false });
        await load();
        return;
      }
      patch({ busy: false, rejected: reason });
    });
  }

  return { get: store.get, subscribe: store.subscribe, load, publish };
}

export type PostFlow = ReturnType<typeof createPostFlow>;
