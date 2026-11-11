import type { Loadable } from '@/lib/loadable';

import { withEnergy, type Belly } from './belly';
import type { CloudAnswer, CloudRequest } from './cloudGate';
import type { ConsentStatus } from './consent';

export type MeteredStore = {
  getSnapshot(): { userId: string | null; status: Loadable<ConsentStatus> };
  applyBelly(userId: string, belly: Belly): void;
  refresh(): Promise<unknown>;
};

export function metered(
  store: MeteredStore,
  send: (request: CloudRequest) => Promise<CloudAnswer>,
) {
  return async (request: CloudRequest): Promise<CloudAnswer> => {
    const userId = store.getSnapshot().userId;
    const answer = await send(request);
    if (!userId || store.getSnapshot().userId !== userId) return answer;
    const status = store.getSnapshot().status;
    const belly = status.status === 'idle' ? null : (status.data?.belly ?? null);
    const next = answer.ok && belly ? withEnergy(belly, answer.body) : null;
    if (next) store.applyBelly(userId, next);
    else if (answer.ok || answer.error === 'hungry') void store.refresh();
    return answer;
  };
}
