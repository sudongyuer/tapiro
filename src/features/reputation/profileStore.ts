import type { ReportReason } from '@/lib/report';
import { createStore } from '@/lib/store';

import type { ReviewDrafts } from './drafts';
import {
  createFocus,
  createRequests,
  needsLoad,
  readInto,
  staleIfReady,
  type Loadable,
} from '@/lib/loadable';
import { cleanText, textFits } from './model';
import { ProfileGoneError } from './reputationService';
import type {
  ProfileCard,
  ProfileReview,
  Reply,
  ReplyFailure,
  ReputationService,
  ReviewPage,
} from './types';

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
  gone: Readonly<Record<string, true>>;
  readFailed: Readonly<Record<string, true>>;
};

const IDLE: ProfilesState = {
  userId: null,
  cards: {},
  reviews: {},
  replies: {},
  gone: {},
  readFailed: {},
};

export const cardKey = (personId: string) => `card:${personId}`;
export const listKey = (personId: string) => `list:${personId}`;
const pageKey = (personId: string) => `page:${personId}`;

const withReply = (rows: ProfileReview[], reviewId: string, reply: Reply) =>
  rows.map((row) => (row.id === reviewId ? { ...row, reply } : row));

export function createProfileStore({
  service,
  drafts,
  onReplied = () => undefined,
}: {
  service: ReputationService;
  drafts: ReviewDrafts;
  onReplied?: (reviewId: string, reply: Reply) => void;
}) {
  const store = createStore<ProfilesState>(IDLE);
  const requests = createRequests();
  const focus = createFocus();
  // The last row's onAppear fires once, so a next page refused or dropped around a head read is never asked for again.
  const moreWanted = new Set<string>();
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

  function setReadFailed(key: string, failed: boolean) {
    if (Boolean(get().readFailed[key]) === failed) return;
    const { [key]: _dropped, ...rest } = get().readFailed;
    patch({ readFailed: failed ? { ...rest, [key]: true } : rest });
  }

  async function tracked<T>(key: string, userId: string, at: number, read: () => Promise<T>) {
    const request = requests.latest(key);
    const mine = () => current(userId, at) && requests.isLatest(key, request);
    try {
      const value = await read();
      if (mine()) setReadFailed(key, false);
      return value;
    } catch (error) {
      if (mine()) setReadFailed(key, true);
      throw error;
    }
  }

  function setGone(personId: string, gone: boolean) {
    if (Boolean(get().gone[personId]) === gone) return;
    const { [personId]: _dropped, ...rest } = get().gone;
    patch({ gone: gone ? { ...rest, [personId]: true } : rest });
  }

  function reloadCard(personId: string) {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const at = generation;
    return readInto({
      requests,
      key: cardKey(personId),
      read: () =>
        tracked(cardKey(personId), userId, at, async () => {
          try {
            const card = await service.profile(personId);
            if (current(userId, at)) setGone(personId, false);
            return card;
          } catch (error) {
            if (error instanceof ProfileGoneError && current(userId, at)) setGone(personId, true);
            throw error;
          }
        }),
      current: () => current(userId, at),
      value: () => get().cards[personId],
      set: (next) => setCard(personId, next),
    });
  }

  function reloadList(personId: string) {
    const { userId } = get();
    if (!userId) return Promise.resolve();
    const at = generation;
    return readInto({
      requests,
      key: listKey(personId),
      read: () =>
        tracked(listKey(personId), userId, at, async () => ({
          ...(await service.profileReviews(personId, null)),
          more: 'idle' as const,
        })),
      current: () => current(userId, at),
      value: () => get().reviews[personId],
      set: (next) => setList(personId, next),
    }).then(() => {
      if (current(userId, at) && moreWanted.delete(personId)) void loadMore(personId);
    });
  }

  async function loadMore(personId: string) {
    const { userId } = get();
    const list = get().reviews[personId];
    if (!userId || !list || list.status === 'idle' || list.status === 'loading' || !list.data)
      return;
    const { hasMore, nextCursor, more } = list.data;
    if (!hasMore || !nextCursor || more === 'loading') return;
    if (requests.busy(listKey(personId))) {
      moreWanted.add(personId);
      return;
    }
    const at = generation;
    const head = requests.latest(listKey(personId));
    const key = pageKey(personId);
    const request = requests.start(key);
    setList(personId, { ...list, data: { ...list.data, more: 'loading' } });
    let page: ReviewPage | null = null;
    try {
      page = await service.profileReviews(personId, nextCursor);
    } catch {
      page = null;
    } finally {
      requests.end(key, request);
    }
    const now = get().reviews[personId];
    if (!current(userId, at) || !requests.isLatest(key, request)) return;
    if (!now || now.status === 'idle' || !now.data) return;
    if (!page || requests.latest(listKey(personId)) !== head) {
      setList(personId, { ...now, data: { ...now.data, more: page ? 'idle' : 'failed' } });
      if (page) void loadMore(personId);
      return;
    }
    const seen = new Set(now.data.items.map((row) => row.id));
    setList(personId, {
      status: now.status,
      data: {
        items: [...now.data.items, ...page.items.filter((row) => !seen.has(row.id))],
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
        more: 'idle',
      },
    });
  }

  function applyReply(reviewId: string, reply: Reply) {
    for (const [personId, card] of Object.entries(get().cards)) {
      if (card.status === 'idle' || !card.data) continue;
      if (!card.data.latestReviews.some((row) => row.id === reviewId)) continue;
      const dropped = requests.supersede(cardKey(personId));
      setCard(personId, {
        status: card.status,
        data: { ...card.data, latestReviews: withReply(card.data.latestReviews, reviewId, reply) },
      });
      if (dropped) void reloadCard(personId);
    }
    for (const [personId, list] of Object.entries(get().reviews)) {
      if (list.status === 'idle' || !list.data) continue;
      if (!list.data.items.some((row) => row.id === reviewId)) continue;
      const dropped = requests.supersede(listKey(personId));
      setList(personId, {
        status: list.status,
        data: { ...list.data, items: withReply(list.data.items, reviewId, reply) },
      });
      if (dropped) void reloadList(personId);
    }
    onReplied(reviewId, reply);
  }

  async function reply(reviewId: string, body: string) {
    const userId = get().userId;
    if (!userId || get().replies[reviewId]?.phase === 'sending') return false;
    drafts.setReply(userId, reviewId, body);
    const text = cleanText(body);
    if (text === '' || !textFits(text)) {
      setReply(reviewId, { phase: 'failed', failure: 'invalid' });
      return false;
    }
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
      else {
        requests.dirty(cardKey(personId));
        setCard(personId, staleIfReady(card));
      }
    }
    if (list) {
      if (focused) void reloadList(personId);
      else {
        requests.dirty(listKey(personId));
        setList(personId, staleIfReady(list));
      }
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
    moreWanted.clear();
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
    report(personId: string, reason: ReportReason, note: string | null) {
      return service.reportPerson(personId, reason, note);
    },
    reportReview(reviewId: string, reason: ReportReason, note: string | null) {
      return service.reportReview(reviewId, reason, note);
    },
    markBlocked(personId: string, blocked: boolean) {
      const card = get().cards[personId];
      if (!card || card.status === 'idle' || !card.data) return;
      const dropped = requests.supersede(cardKey(personId));
      setCard(personId, { ...card, data: { ...card.data, blockedByMe: blocked } });
      if (dropped) void reloadCard(personId);
    },
    refresh,
    onSignal() {
      if (get().userId) refresh();
    },
  };
}

export type ProfileStore = ReturnType<typeof createProfileStore>;
