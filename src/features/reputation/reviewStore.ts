import type { LiveSignal } from '@/lib/live';
import { createStore } from '@/lib/store';

import type { ReviewDrafts } from './drafts';
import {
  createFocus,
  createRequests,
  IDLE_LOAD,
  loaded,
  loadFailed,
  loading,
  needsLoad,
  staleIfReady,
  type Loadable,
} from '@/lib/loadable';
import { validDraft } from './model';
import {
  pairKey,
  targetKey,
  type ItemKind,
  type PendingReview,
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
};

const IDLE: ReviewsState = { userId: null, pending: IDLE_LOAD, items: {}, submits: {} };

const PENDING = 'pending';

const RELOAD_AFTER: readonly SubmitFailure[] = ['closed', 'locked', 'notFound'];

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

  async function reloadPending() {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(PENDING);
    patch({ pending: loading(get().pending) });
    try {
      const items = await service.pendingReviews();
      if (!current(userId, at) || !requests.isLatest(PENDING, request)) return;
      patch({ pending: loaded(items) });
    } catch {
      if (!current(userId, at) || !requests.isLatest(PENDING, request)) return;
      patch({ pending: loadFailed(get().pending) });
    }
  }

  async function reloadItem(kind: ItemKind, itemId: string) {
    const { userId } = get();
    if (!userId) return;
    const key = pairKey(kind, itemId);
    const at = generation;
    const request = requests.start(key);
    setItem(key, loading(get().items[key]));
    try {
      const pairs = await service.reviewState(kind, itemId);
      if (!current(userId, at) || !requests.isLatest(key, request)) return;
      setItem(key, loaded(pairs));
    } catch {
      if (!current(userId, at) || !requests.isLatest(key, request)) return;
      setItem(key, loadFailed(get().items[key]));
    }
  }

  function applySubmitted(target: ReviewTarget, pair: ReviewPair) {
    const key = pairKey(target.kind, target.itemId);
    const item = get().items[key];
    if (item && item.status !== 'idle' && item.data) {
      requests.supersede(key);
      const pairs = item.data.some((row) => samePair(row, target))
        ? item.data.map((row) => (samePair(row, target) ? pair : row))
        : [...item.data, pair];
      setItem(key, { status: item.status, data: pairs });
    } else if (item) {
      void reloadItem(target.kind, target.itemId);
    }
    const pending = get().pending;
    if (pending.status !== 'idle' && pending.data) {
      requests.supersede(PENDING);
      patch({
        pending: {
          status: pending.status === 'loading' ? 'ready' : pending.status,
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
    }
  }

  async function submit(target: ReviewTarget, role: Role, draft: ReviewDraft) {
    const userId = get().userId;
    const key = targetKey(target);
    if (!userId || get().submits[key]?.phase === 'sending') return false;
    drafts.setReview(userId, key, draft);
    const valid = validDraft(draft, role);
    if (!valid) return false;
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
    setSubmit(key, { phase: 'failed', failure: result.failure });
    if (RELOAD_AFTER.includes(result.failure)) {
      void reloadItem(target.kind, target.itemId);
      void reloadPending();
    }
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
    dismissFailure(target: ReviewTarget) {
      const key = targetKey(target);
      if (get().submits[key]?.phase === 'failed') setSubmit(key, null);
    },
    refresh,
    onSignal,
  };
}

export type ReviewStore = ReturnType<typeof createReviewStore>;
