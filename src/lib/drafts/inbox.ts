import type { BountyDraft } from './bountyDraft';

export type DraftDelivery = { userId: string; draft: BountyDraft };

// 问小貘 hands a draft to the post form through here so neither feature imports the other. A draft waits for one form
// to take it; a newer draft replaces one nobody took, and a user change never sees another user's draft.
export function createDraftInbox() {
  let waiting: DraftDelivery | null = null;
  const listeners = new Set<() => void>();
  return {
    put(userId: string, draft: BountyDraft) {
      waiting = { userId, draft };
      listeners.forEach((listener) => listener());
    },
    take(userId: string): BountyDraft | null {
      if (waiting?.userId !== userId) return null;
      const { draft } = waiting;
      waiting = null;
      return draft;
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
