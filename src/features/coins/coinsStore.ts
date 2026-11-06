import { createStore } from '@/lib/store';
import {
  createRequests,
  IDLE_LOAD,
  loaded,
  loadFailed,
  loading,
  needsLoad,
  staleIfReady,
  type Loadable,
} from '@/lib/loadable';

import type { CodeDrafts } from './codeDrafts';
import type {
  CoinBalance,
  CoinRow,
  CoinsService,
  FeedResult,
  FeedStatus,
  Invite,
  RedeemFailure,
} from './types';

export type History = {
  items: CoinRow[];
  hasMore: boolean;
  nextCursor: number | null;
  more: 'idle' | 'loading' | 'failed';
};

export type FeedState =
  | { phase: 'idle' }
  | { phase: 'sending' }
  | { phase: 'answered'; status: FeedResult['status'] }
  | { phase: 'failed' };

export type RedeemState =
  { phase: 'idle' } | { phase: 'sending' } | { phase: 'failed'; failure: RedeemFailure };

export type CoinsState = {
  userId: string | null;
  balance: Loadable<CoinBalance>;
  history: Loadable<History>;
  feedStatus: Loadable<FeedStatus>;
  feed: FeedState;
  invite: Loadable<Invite>;
  redeem: RedeemState;
};

const IDLE: CoinsState = {
  userId: null,
  balance: IDLE_LOAD,
  history: IDLE_LOAD,
  feedStatus: IDLE_LOAD,
  feed: { phase: 'idle' },
  invite: IDLE_LOAD,
  redeem: { phase: 'idle' },
};

type LoadKey = 'balance' | 'history' | 'feedStatus' | 'invite';

export function createCoinsStore({
  service,
  drafts,
}: {
  service: CoinsService;
  drafts: CodeDrafts;
}) {
  const store = createStore<CoinsState>(IDLE);
  const requests = createRequests();
  let generation = 0;

  const get = store.get;
  const patch = (next: Partial<CoinsState>) => store.set({ ...get(), ...next });
  const current = (userId: string, at: number) => at === generation && get().userId === userId;

  async function reload<K extends LoadKey>(
    key: K,
    read: () => Promise<CoinsState[K] extends Loadable<infer T> ? T : never>,
  ) {
    const { userId } = get();
    if (!userId) return;
    const at = generation;
    const request = requests.start(key);
    patch({ [key]: loading(get()[key] as Loadable<unknown>) } as Partial<CoinsState>);
    try {
      const value = await read();
      if (!current(userId, at) || !requests.isLatest(key, request)) return;
      patch({ [key]: loaded(value) } as Partial<CoinsState>);
    } catch {
      if (!current(userId, at) || !requests.isLatest(key, request)) return;
      patch({ [key]: loadFailed(get()[key] as Loadable<unknown>) } as Partial<CoinsState>);
    }
  }

  const reloadBalance = () => reload('balance', () => service.balance());
  const reloadHistory = () =>
    reload('history', async () => ({
      ...(await service.history(null)),
      more: 'idle' as const,
    }));
  const reloadFeedStatus = () => reload('feedStatus', () => service.feedStatus());
  const reloadInvite = () => reload('invite', () => service.invite());

  async function loadMoreHistory() {
    const { userId, history } = get();
    if (!userId || history.status !== 'ready' || !history.data) return;
    const { hasMore, nextCursor, more } = history.data;
    if (!hasMore || nextCursor === null || more === 'loading') return;
    const at = generation;
    const request = requests.start('history');
    patch({ history: { ...history, data: { ...history.data, more: 'loading' } } });
    try {
      const page = await service.history(nextCursor);
      const now = get().history;
      if (!current(userId, at) || !requests.isLatest('history', request)) return;
      if (now.status === 'idle' || !now.data) return;
      const seen = new Set(now.data.items.map((row) => row.id));
      patch({
        history: loaded({
          items: [...now.data.items, ...page.items.filter((row) => !seen.has(row.id))],
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          more: 'idle',
        }),
      });
    } catch {
      const now = get().history;
      if (!current(userId, at) || !requests.isLatest('history', request)) return;
      if (now.status !== 'idle' && now.data) {
        patch({ history: { ...now, data: { ...now.data, more: 'failed' } } });
      }
    }
  }

  function applyCoins(coins: number) {
    const balance = get().balance;
    if (balance.status === 'idle' || !balance.data || balance.data.coins === coins) return;
    requests.supersede('balance');
    patch({ balance: { ...balance, data: { ...balance.data, coins } } });
  }

  async function feed() {
    const userId = get().userId;
    if (!userId || get().feed.phase === 'sending') return null;
    const at = generation;
    patch({ feed: { phase: 'sending' } });
    try {
      const result = await service.feed();
      if (!current(userId, at)) return null;
      requests.supersede('feedStatus');
      patch({
        feed: { phase: 'answered', status: result.status },
        feedStatus: loaded({
          fedThisWeek: result.fedThisWeek,
          nextWeekAt: result.nextWeekAt,
          coins: result.coins,
        }),
      });
      applyCoins(result.coins);
      if (result.status === 'fed') markHistoryChanged();
      return result.status;
    } catch {
      if (current(userId, at)) patch({ feed: { phase: 'failed' } });
      return null;
    }
  }

  function markHistoryChanged() {
    const history = get().history;
    if (history.status !== 'idle') patch({ history: staleIfReady(history) });
  }

  async function redeem(typed: string) {
    const userId = get().userId;
    if (!userId || get().redeem.phase === 'sending') return false;
    drafts.set(userId, typed);
    const at = generation;
    patch({ redeem: { phase: 'sending' } });
    const result = await service.redeem(typed);
    if (!current(userId, at)) return false;
    if (result.ok) {
      drafts.set(userId, '');
      requests.supersede('invite');
      patch({ redeem: { phase: 'idle' }, invite: loaded(result.invite) });
      return true;
    }
    patch({ redeem: { phase: 'failed', failure: result.failure } });
    if (result.failure === 'alreadyRedeemed' || result.failure === 'tooLate') void reloadInvite();
    return false;
  }

  function refresh() {
    const { userId, balance, history, feedStatus, invite } = get();
    if (!userId) return;
    if (balance.status !== 'idle') void reloadBalance();
    if (history.status !== 'idle') void reloadHistory();
    if (feedStatus.status !== 'idle') void reloadFeedStatus();
    if (invite.status !== 'idle') void reloadInvite();
  }

  function clear() {
    generation += 1;
    requests.clear();
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
    loadBalance() {
      if (needsLoad(get().balance)) void reloadBalance();
    },
    loadHistory() {
      if (needsLoad(get().history)) void reloadHistory();
    },
    loadFeedStatus() {
      if (needsLoad(get().feedStatus)) void reloadFeedStatus();
    },
    loadInvite() {
      if (needsLoad(get().invite)) void reloadInvite();
    },
    reloadBalance,
    reloadHistory,
    reloadFeedStatus,
    reloadInvite,
    loadMoreHistory,
    feed,
    settleFeed() {
      if (get().feed.phase !== 'sending') patch({ feed: { phase: 'idle' } });
    },
    redeem,
    codeDraft() {
      const userId = get().userId;
      return userId ? drafts.get(userId) : '';
    },
    saveCodeDraft(typed: string) {
      const userId = get().userId;
      if (userId) drafts.set(userId, typed);
    },
    dismissRedeemFailure() {
      if (get().redeem.phase === 'failed') patch({ redeem: { phase: 'idle' } });
    },
    onCoinsChanged() {
      const { userId, balance } = get();
      if (!userId) return;
      if (balance.status !== 'idle') void reloadBalance();
      markHistoryChanged();
    },
    refresh,
  };
}

export type CoinsStore = ReturnType<typeof createCoinsStore>;
