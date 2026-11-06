import { createStore } from '@/lib/store';

import type { ReviewDrafts } from './drafts';
import {
  createFocus,
  createRequests,
  loaded,
  loadFailed,
  loading,
  needsLoad,
  staleIfReady,
  type Loadable,
} from '@/lib/loadable';
import { cleanText, textFits } from './model';
import type { ProfileCard, ProfileReview, Reply, ReplyFailure, ReputationService } from './types';

export type ReviewList = {
  items: ProfileReview[];
  hasMore: boolean;
  nextCursor: string | null;
  more: 'idle' | 'loading' | 'failed';
};

export type ReplyState = { phase: 'sending' } | { phase: 'failed'; failure: ReplyFailure };

export type ProfilesState = {
  userId: string | null;
  cards: Readonly<Record<string, Loadable<ProfileCard>>>;
  reviews: Readonly<Record<string, Loadable<ReviewList>>>;
  replies: Readonly<Record<string, ReplyState>>;
};

const IDLE: ProfilesState = { userId: null, cards: {}, reviews: {}, replies: {} };

const cardKey = (personId: string) => `card:${personId}`;
const listKey = (personId: string) => `list:${personId}`;

const withReply = (rows: ProfileReview[], reviewId: string, reply: Reply) =>
  rows.map((row) => (row.id === reviewId ? { ...row, reply } : row));

export function createProfileStore({
  service,
  drafts,
}: {
  service: ReputationService;
  drafts: ReviewDrafts;
}) {
  const store = createStore<ProfilesState>(IDLE);
  const requests = createRequests();
  const focus = createFocus();
  let generation = 0;

  const get = store.get;
  const patch = (next: Partial<ProfilesState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  const setCard = (personId: string, next: Loadable<ProfileCard>) =>
    patch({ cards: { ...get().cards, [personId]: next } });
  const setList = (personId: string, next: Loadable<ReviewList>) =>
    patch({ reviews: { ...get().reviews, [personId]: next } });

  function setReply(reviewId: string, next: ReplyState | null) {
    const { [reviewId]: _dropped, ...rest } = get().replies;
    patch({ replies: next ? { ...rest, [reviewId]: next } : rest });
  }

  async function reloadCard(personId: string) {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(cardKey(personId));
    setCard(personId, loading(get().cards[personId]));
    try {
      const card = await service.profile(personId);
      if (!current(userId, at) || !requests.isLatest(cardKey(personId), request)) return;
      setCard(personId, loaded(card));
    } catch {
      if (!current(userId, at) || !requests.isLatest(cardKey(personId), request)) return;
      setCard(personId, loadFailed(get().cards[personId]));
    }
  }

  async function reloadList(personId: string) {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(listKey(personId));
    setList(personId, loading(get().reviews[personId]));
    try {
      const page = await service.profileReviews(personId, null);
      if (!current(userId, at) || !requests.isLatest(listKey(personId), request)) return;
      setList(personId, loaded({ ...page, more: 'idle' }));
    } catch {
      if (!current(userId, at) || !requests.isLatest(listKey(personId), request)) return;
      setList(personId, loadFailed(get().reviews[personId]));
    }
  }

  async function loadMore(personId: string) {
    const { userId } = get();
    const list = get().reviews[personId];
    if (!userId || !list || list.status !== 'ready' || !list.data) return;
    const { hasMore, nextCursor, more } = list.data;
    if (!hasMore || !nextCursor || more === 'loading') return;
    const at = generation;
    const request = requests.start(listKey(personId));
    setList(personId, { ...list, data: { ...list.data, more: 'loading' } });
    try {
      const page = await service.profileReviews(personId, nextCursor);
      const now = get().reviews[personId];
      if (!current(userId, at) || !requests.isLatest(listKey(personId), request)) return;
      if (!now || now.status === 'idle' || !now.data) return;
      const seen = new Set(now.data.items.map((row) => row.id));
      setList(
        personId,
        loaded({
          items: [...now.data.items, ...page.items.filter((row) => !seen.has(row.id))],
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          more: 'idle',
        }),
      );
    } catch {
      const now = get().reviews[personId];
      if (!current(userId, at) || !requests.isLatest(listKey(personId), request)) return;
      if (now && now.status !== 'idle' && now.data) {
        setList(personId, { ...now, data: { ...now.data, more: 'failed' } });
      }
    }
  }

  function applyReply(reviewId: string, reply: Reply) {
    for (const [personId, card] of Object.entries(get().cards)) {
      if (card.status === 'idle' || !card.data) continue;
      if (!card.data.latestReviews.some((row) => row.id === reviewId)) continue;
      requests.supersede(cardKey(personId));
      setCard(personId, {
        status: card.status,
        data: { ...card.data, latestReviews: withReply(card.data.latestReviews, reviewId, reply) },
      });
    }
    for (const [personId, list] of Object.entries(get().reviews)) {
      if (list.status === 'idle' || !list.data) continue;
      if (!list.data.items.some((row) => row.id === reviewId)) continue;
      setList(personId, {
        status: list.status,
        data: { ...list.data, items: withReply(list.data.items, reviewId, reply) },
      });
    }
  }

  async function reply(reviewId: string, body: string) {
    const userId = get().userId;
    if (!userId || get().replies[reviewId]?.phase === 'sending') return false;
    drafts.setReply(userId, reviewId, body);
    const text = cleanText(body);
    if (text === '' || !textFits(text)) return false;
    const at = generation;
    setReply(reviewId, { phase: 'sending' });
    const result = await service.reply(reviewId, text);
    if (!current(userId, at)) return false;
    if (result.ok) {
      drafts.setReply(userId, reviewId, '');
      setReply(reviewId, null);
      applyReply(result.reviewId, result.reply);
      return true;
    }
    setReply(reviewId, { phase: 'failed', failure: result.failure });
    if (result.failure === 'alreadyReplied' || result.failure === 'notFound') refresh();
    return false;
  }

  function refreshPerson(personId: string) {
    const card = get().cards[personId];
    const list = get().reviews[personId];
    const focused = focus.has(personId);
    if (card) {
      if (focused) void reloadCard(personId);
      else setCard(personId, staleIfReady(card));
    }
    if (list) {
      if (focused) void reloadList(personId);
      else setList(personId, staleIfReady(list));
    }
  }

  function refresh() {
    const { cards, reviews } = get();
    for (const personId of new Set([...Object.keys(cards), ...Object.keys(reviews)])) {
      refreshPerson(personId);
    }
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
    openProfile(personId: string) {
      const close = focus.open(personId);
      if (needsLoad(get().cards[personId])) void reloadCard(personId);
      return close;
    },
    openReviews(personId: string) {
      const close = focus.open(personId);
      if (needsLoad(get().reviews[personId])) void reloadList(personId);
      return close;
    },
    reloadCard,
    reloadList,
    loadMore,
    replyDraft(reviewId: string) {
      const userId = get().userId;
      return userId ? drafts.reply(userId, reviewId) : '';
    },
    saveReplyDraft(reviewId: string, text: string) {
      const userId = get().userId;
      if (userId) drafts.setReply(userId, reviewId, text);
    },
    reply,
    dismissReplyFailure(reviewId: string) {
      if (get().replies[reviewId]?.phase === 'failed') setReply(reviewId, null);
    },
    markBlocked(personId: string, blocked: boolean) {
      const card = get().cards[personId];
      if (!card || card.status === 'idle' || !card.data) return;
      requests.supersede(cardKey(personId));
      setCard(personId, { ...card, data: { ...card.data, blockedByMe: blocked } });
    },
    refresh,
    onSignal() {
      if (get().userId) refresh();
    },
  };
}

export type ProfileStore = ReturnType<typeof createProfileStore>;
