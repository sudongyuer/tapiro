import { sessionEnds } from '@/lib/sessionEnds';
import { userCleanups } from '@/lib/userCleanups';

import type { BountyDraft } from './bountyDraft';

export const DRAFT_WAIT_MS = 30_000;

export type DraftDelivery = { userId: string; draft: BountyDraft; at: number };

// A draft nobody took soon after 填进表单 (the form never opened) must not fill a form the user opens much later.
export function createDraftInbox(now: () => number = Date.now) {
  let waiting: DraftDelivery | null = null;
  const listeners = new Set<() => void>();
  return {
    put(userId: string, draft: BountyDraft) {
      waiting = { userId, draft, at: now() };
      listeners.forEach((listener) => listener());
    },
    take(userId: string): BountyDraft | null {
      if (waiting?.userId !== userId) return null;
      const { draft, at } = waiting;
      waiting = null;
      return now() - at <= DRAFT_WAIT_MS ? draft : null;
    },
    clear(userId: string) {
      if (waiting?.userId === userId) waiting = null;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type DraftInbox = ReturnType<typeof createDraftInbox>;

export const bountyDraftInbox = createDraftInbox();

userCleanups.register((userId) => bountyDraftInbox.clear(userId));
sessionEnds.register((userId) => bountyDraftInbox.clear(userId));
