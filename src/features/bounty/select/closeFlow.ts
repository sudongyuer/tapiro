import { createInFlightGuard } from '@/lib/inFlightGuard';
import { createStore } from '@/lib/store';

import type { ActionResult, PostCharge, StatusDetail } from '../status/types';

export type CloseState = {
  kind: 'idle' | 'checking' | 'sending' | 'failed' | 'changed' | 'closed';
};

export type AskClose = (charge: PostCharge) => Promise<boolean>;

type Deps = {
  detail: () => Promise<StatusDetail | 'unavailable'>;
  close: () => Promise<ActionResult<{ refund: PostCharge | null }>>;
  reload: () => Promise<void>;
};

const FAILED: ActionResult<never> = { ok: false, reason: 'failed' };

export const closeBusy = (state: CloseState) =>
  state.kind === 'checking' || state.kind === 'sending';

export function createCloseFlow(deps: Deps) {
  const store = createStore<CloseState>({ kind: 'idle' });
  const guard = createInFlightGuard();
  const set = (kind: CloseState['kind']) => store.set({ kind });

  async function changed() {
    set('changed');
    await deps.reload();
  }

  async function charge(): Promise<PostCharge | 'changed' | 'failed'> {
    try {
      const detail = await deps.detail();
      if (detail === 'unavailable' || detail.status !== 'open' || !detail.charge) return 'changed';
      return detail.charge;
    } catch {
      return 'failed';
    }
  }

  return {
    get: store.get,
    subscribe: store.subscribe,
    close: (ask: AskClose) =>
      guard(async () => {
        if (store.get().kind === 'closed') return;
        set('checking');
        const found = await charge();
        if (found === 'failed') return set('failed');
        if (found === 'changed') return changed();
        set('idle');
        if (!(await ask(found))) return;
        set('sending');
        const result = await deps.close().catch(() => FAILED);
        if (result.ok) {
          set('closed');
          await deps.reload();
        } else if (result.reason === 'changed' || result.reason === 'unavailable') {
          await changed();
        } else {
          set('failed');
        }
      }),
  };
}
