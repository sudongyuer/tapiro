import { createInFlightGuard } from '@/lib/inFlightGuard';
import { createStore } from '@/lib/store';

import type { PublishRideArgs, RidePostStatus, RideService } from '../types';
import type { RideDraft } from './draft';
import { checkRideDraft, type RideDraftError } from './validate';

export type RideCost =
  | { kind: 'free'; left: number; of: number }
  | { kind: 'coin'; balance: number }
  | { kind: 'none'; nextFreeAt: string };

export type RideGate = 'ok' | 'noPayee' | 'blocked' | 'noBalance';

export type StatusState =
  { kind: 'loading' } | { kind: 'ready'; status: RidePostStatus } | { kind: 'failed' };

export type PublishState = {
  status: StatusState;
  busy: boolean;
  rejected: 'failed' | 'invalid' | null;
};

export function rideCost(status: RidePostStatus): RideCost {
  if (status.freePostsLeft > 0) {
    return { kind: 'free', left: status.freePostsLeft, of: status.freePostsPerMonth };
  }
  if (status.coins >= 1) return { kind: 'coin', balance: status.coins };
  return { kind: 'none', nextFreeAt: status.nextFreeAt };
}

export function rideGate(status: RidePostStatus): RideGate {
  if (!status.hasPayee) return 'noPayee';
  if (status.blocked) return 'blocked';
  return rideCost(status).kind === 'none' ? 'noBalance' : 'ok';
}

export function canPublish(state: PublishState) {
  return !state.busy && state.status.kind === 'ready' && rideGate(state.status.status) === 'ok';
}

export type PublishHandlers = {
  onPublished: (args: PublishRideArgs) => void;
  onInvalid: (error: RideDraftError) => void;
  onAlreadySent: () => void;
};

export function createPublishFlow(deps: {
  service: Pick<RideService, 'postStatus' | 'publish'>;
  draft: () => RideDraft;
  clearDraft: () => void;
  now: () => Date;
}) {
  const store = createStore<PublishState>({
    status: { kind: 'loading' },
    busy: false,
    rejected: null,
  });
  const guard = createInFlightGuard();
  const patch = (next: Partial<PublishState>) => store.set({ ...store.get(), ...next });

  async function load() {
    patch({ status: { kind: 'loading' } });
    try {
      patch({ status: { kind: 'ready', status: await deps.service.postStatus() } });
    } catch {
      patch({ status: { kind: 'failed' } });
    }
  }

  function publish(handlers: PublishHandlers) {
    return guard(async () => {
      if (!canPublish(store.get())) return;
      const checked = checkRideDraft(deps.draft(), deps.now());
      if (!checked.ok) return handlers.onInvalid(checked.error);
      patch({ busy: true, rejected: null });
      const outcome = await deps.service.publish(checked.args);
      if (outcome.ok) {
        deps.clearDraft();
        patch({ busy: false });
        handlers.onPublished(checked.args);
        return;
      }
      if (outcome.reason === 'alreadySent') {
        deps.clearDraft();
        patch({ busy: false });
        handlers.onAlreadySent();
        return;
      }
      if (outcome.reason === 'invalid' || outcome.reason === 'failed') {
        patch({ busy: false, rejected: outcome.reason });
        return;
      }
      patch({ busy: false });
      await load();
    });
  }

  return { get: store.get, subscribe: store.subscribe, load, publish };
}

export type PublishFlow = ReturnType<typeof createPublishFlow>;
