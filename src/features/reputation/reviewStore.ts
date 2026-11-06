import type { LiveSignal } from '@/lib/live';
import { createStore } from '@/lib/store';

import type { ReviewDrafts } from './drafts';
import {
  createFocus,
  createRequests,
  IDLE_LOAD,
  needsLoad,
  readInto,
  staleIfReady,
  type Loadable,
} from '@/lib/loadable';
import { draftChanged, draftFromReview, validDraft } from './model';
import {
  pairKey,
  targetKey,
  type ItemKind,
  type PendingReview,
  type Reply,
  type ReputationService,
  type ReviewDraft,
  type ReviewPair,
  type ReviewTarget,
  type Role,
  type SubmitFailure,
} from './types';

export const REVIEW_SIGNALS = ['bounty.reviewed', 'ride.reviewed'] as const;

export type SubmitState = { phase: 'sending' } | { phase: 'failed'; failure: SubmitFailure };

export type ReviewsState = {
  userId: string | null;
  pending: Loadable<PendingReview[]>;
  items: Readonly<Record<string, Loadable<ReviewPair[]>>>;
  submits: Readonly<Record<string, SubmitState>>;
  readFailed: Readonly<Record<string, true>>;
};

const IDLE: ReviewsState = {
  userId: null,
  pending: IDLE_LOAD,
  items: {},
  submits: {},
  readFailed: {},
};

const PENDING = 'pending';

const RELOAD_AFTER: readonly SubmitFailure[] = ['closed', 'locked', 'notFound', 'failed'];

const signalKind = (signal: LiveSignal): ItemKind | null =>
  signal.kind === 'bounty.reviewed' ? 'bounty' : signal.kind === 'ride.reviewed' ? 'ride' : null;

const samePair = (pair: ReviewPair, target: ReviewTarget) =>
  pair.kind === target.kind &&
  pair.itemId === target.itemId &&
  pair.counterpart?.id === target.reviewee;

export function createReviewStore({
  service,
  drafts,
}: {
  service: ReputationService;
  drafts: ReviewDrafts;
}) {
  const store = createStore<ReviewsState>(IDLE);
  const requests = createRequests();
  const focus = createFocus();
  let generation = 0;

  const get = store.get;
  const patch = (next: Partial<ReviewsState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  const setItem = (key: string, next: Loadable<ReviewPair[]>) =>
    patch({ items: { ...get().items, [key]: next } });

  function setSubmit(key: string, next: SubmitState | null) {
    const { [key]: _dropped, ...rest } = get().submits;
    patch({ submits: next ? { ...rest, [key]: next } : rest });
  }

  function setReadFailed(key: string, failed: boolean) {
    if (Boolean(get().readFailed[key]) === failed) return;
    const { [key]: _dropped, ...rest } = get().readFailed;
    patch({ readFailed: failed ? { ...rest, [key]: true } : rest });
  }

  function reloadPending() {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const at = generation;
    return readInto({
      requests,
      key: PENDING,
      read: () => service.pendingReviews(),
      current: () => current(userId, at),
      value: () => get().pending,
      set: (pending) => patch({ pending }),
    });
  }

  function reloadItem(kind: ItemKind, itemId: string) {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const key = pairKey(kind, itemId);
    const at = generation;
    return readInto({
      requests,
      key,
      read: async () => {
        try {
          const pairs = await service.reviewState(kind, itemId);
          setReadFailed(key, false);
          return pairs;
        } catch (error) {
          setReadFailed(key, true);
          throw error;
        }
      },
      current: () => current(userId, at),
      value: () => get().items[key],
      set: (next) => setItem(key, next),
    });
  }

  function applySubmitted(target: ReviewTarget, pair: ReviewPair) {
    const key = pairKey(target.kind, target.itemId);
    const item = get().items[key];
    if (item && item.status !== 'idle' && item.data) {
      const dropped = requests.supersede(key);
      const pairs = item.data.some((row) => samePair(row, target))
        ? item.data.map((row) => (samePair(row, target) ? pair : row))
        : [...item.data, pair];
      setItem(key, { status: item.status, data: pairs });
      if (dropped) void reloadItem(target.kind, target.itemId);
    } else if (item) {
      void reloadItem(target.kind, target.itemId);
    }
    const pending = get().pending;
    if (pending.status !== 'idle' && pending.data) {
      const dropped = requests.supersede(PENDING);
      patch({
        pending: {
          status: pending.status,
          data: pending.data.filter(
            (row) =>
              !(
                row.kind === target.kind &&
                row.itemId === target.itemId &&
                row.counterpart?.id === target.reviewee
              ),
          ),
        },
      });
      if (dropped) void reloadPending();
    }
  }

  function applyReply(reviewId: string, reply: Reply) {
    for (const [key, item] of Object.entries(get().items)) {
      if (item.status === 'idle' || !item.data) continue;
      if (!item.data.some((row) => row.theirs?.id === reviewId)) continue;
      const dropped = requests.supersede(key);
      setItem(key, {
        ...item,
        data: item.data.map((row) =>
          row.theirs?.id === reviewId ? { ...row, theirs: { ...row.theirs, reply } } : row,
        ),
      });
      if (dropped) {
        const [kind, itemId] = key.split(':') as [ItemKind, string];
        void reloadItem(kind, itemId);
      }
    }
  }

  function alreadyStored(target: ReviewTarget, draft: ReviewDraft) {
    const item = get().items[pairKey(target.kind, target.itemId)];
    const pair =
      item && item.status !== 'idle' ? item.data?.find((row) => samePair(row, target)) : null;
    return !!pair?.mine && !draftChanged(draft, draftFromReview(pair));
  }

  async function submit(target: ReviewTarget, role: Role, draft: ReviewDraft) {
    const userId = get().userId;
    const key = targetKey(target);
    if (!userId || get().submits[key]?.phase === 'sending') return false;
    drafts.setReview(userId, key, draft);
    const valid = validDraft(draft, role);
    if (!valid) {
      setSubmit(key, { phase: 'failed', failure: 'invalid' });
      return false;
    }
    const at = generation;
    setSubmit(key, { phase: 'sending' });
    const result = await service.submitReview(target, valid);
    if (!current(userId, at)) return false;
    if (result.ok) {
      drafts.setReview(userId, key, null);
      setSubmit(key, null);
      applySubmitted(target, result.pair);
      return true;
    }
    if (RELOAD_AFTER.includes(result.failure)) {
      void reloadPending();
      await reloadItem(target.kind, target.itemId);
      if (!current(userId, at)) return false;
      if (alreadyStored(target, draft)) {
        drafts.setReview(userId, key, null);
        setSubmit(key, null);
        return true;
      }
    }
    setSubmit(key, { phase: 'failed', failure: result.failure });
    return false;
  }

  function refresh() {
    const { userId, pending, items } = get();
    if (!userId) return;
    if (pending.status !== 'idle') void reloadPending();
    for (const key of Object.keys(items)) refreshItem(key);
  }

  function refreshItem(key: string) {
    const item = get().items[key];
    if (!item) return;
    if (focus.has(key)) {
      const [kind, itemId] = key.split(':') as [ItemKind, string];
      void reloadItem(kind, itemId);
    } else {
      requests.dirty(key);
      setItem(key, staleIfReady(item));
    }
  }

  function onSignal(signal: LiveSignal | null) {
    if (!get().userId) return;
    if (signal === null) return refresh();
    const kind = signalKind(signal);
    if (!kind) return;
    if (get().pending.status !== 'idle') void reloadPending();
    refreshItem(pairKey(kind, signal.id));
  }

  function clear() {
    generation += 1;
    requests.clear();
    focus.clear();
    store.set(IDLE);
  }

  return {
    getSnapshot: get,
    subscribe: store.subscribe,
    start(userId: string) {
      if (get().userId === userId) return;
      clear();
      patch({ userId });
    },
    clear,
    loadPending() {
      if (needsLoad(get().pending)) void reloadPending();
    },
    reloadPending,
    openItem(kind: ItemKind, itemId: string) {
      const key = pairKey(kind, itemId);
      const close = focus.open(key);
      if (needsLoad(get().items[key])) void reloadItem(kind, itemId);
      return close;
    },
    reloadItem,
    draft(target: ReviewTarget): ReviewDraft | null {
      const userId = get().userId;
      return userId ? drafts.review(userId, targetKey(target)) : null;
    },
    saveDraft(target: ReviewTarget, draft: ReviewDraft | null) {
      const userId = get().userId;
      if (userId) drafts.setReview(userId, targetKey(target), draft);
    },
    submit,
    applyReply,
    dismissFailure(target: ReviewTarget) {
      const key = targetKey(target);
      if (get().submits[key]?.phase === 'failed') setSubmit(key, null);
    },
    refresh,
    onSignal,
  };
}

export type ReviewStore = ReturnType<typeof createReviewStore>;
