import type { FixtureVariant } from './fixtureVariant';
import { createStore } from './store';

export const ACCESSORY_KINDS = [
  'oweMoney',
  'rideSoon',
  'owedToYou',
  'bountyInProgress',
  'waitingConfirm',
] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];
type FixtureKind = Exclude<AccessoryKind, 'waitingConfirm'>;

export type AccessoryItem = {
  id: string;
  kind: AccessoryKind;
  title: string;
  amountSen?: number;
  sub: string;
  payment?: { id: string; counterpart: string; note: string };
};

export const MONEY_KINDS: readonly AccessoryKind[] = ['oweMoney', 'owedToYou'];

export function accessoryPriority(kind: AccessoryKind) {
  return ACCESSORY_KINDS.indexOf(kind) + 1;
}

export type SourceStatus = 'loading' | 'ready' | 'failed' | 'stale';
export type SourceIssue = { source: string; status: Exclude<SourceStatus, 'ready'> };

export type LiveItemsSnapshot = {
  accessory: readonly AccessoryItem[];
  unreadMessages: number;
  issues?: readonly SourceIssue[];
};

export type LiveItems = {
  getSnapshot: () => LiveItemsSnapshot;
  subscribe: (listener: () => void) => () => void;
  publish: (next: LiveItemsSnapshot) => void;
  setSource: (
    name: string,
    items: readonly AccessoryItem[],
    status?: SourceStatus,
    retry?: () => void,
  ) => void;
  retry: (name: string) => void;
};

export const EMPTY_LIVE_ITEMS: LiveItemsSnapshot = { accessory: [], unreadMessages: 0 };

export function createLiveItems(initial: LiveItemsSnapshot = EMPTY_LIVE_ITEMS): LiveItems {
  let base = initial;
  const sources = new Map<string, { items: readonly AccessoryItem[]; status: SourceStatus }>();
  const retries = new Map<string, () => void>();
  const store = createStore(initial);
  // A source that is loading, failed or stale contributes no items: they are not known to be live.
  const merge = () => {
    const live = [...sources.values()].flatMap((source) =>
      source.status === 'ready' ? source.items : [],
    );
    const issues = [...sources.entries()].flatMap(([source, { status }]) =>
      status === 'ready' ? [] : [{ source, status }],
    );
    store.set({ ...base, accessory: [...base.accessory, ...live], issues });
  };
  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    publish(next) {
      base = next;
      merge();
    },
    setSource(name, items, status = 'ready', retry) {
      if (items.length === 0 && status === 'ready' && !sources.has(name)) return;
      sources.set(name, { items, status });
      if (retry) retries.set(name, retry);
      merge();
    },
    retry(name) {
      retries.get(name)?.();
    },
  };
}

export function withoutMoney(snapshot: LiveItemsSnapshot): LiveItemsSnapshot {
  return {
    ...snapshot,
    accessory: snapshot.accessory.filter((item) => !MONEY_KINDS.includes(item.kind)),
  };
}

export const FIXTURE_ACCESSORY: Record<FixtureKind, AccessoryItem> = {
  oweMoney: {
    id: 'fixture-owe',
    kind: 'oweMoney',
    title: '付给阿杰',
    amountSen: 1500,
    sub: '帮取快递',
  },
  rideSoon: {
    id: 'fixture-ride',
    kind: 'rideSoon',
    title: '17:00 → YC · 8 分钟后集合',
    sub: '校门口 · 4 人齐了',
  },
  owedToYou: {
    id: 'fixture-owed',
    kind: 'owedToYou',
    title: '小林说已付你',
    amountSen: 800,
    sub: '帮带一杯咖啡 · 等你确认',
  },
  bountyInProgress: {
    id: 'fixture-progress',
    kind: 'bountyInProgress',
    title: 'Aiman 在讲微积分',
    sub: '今晚 8 点 · 微积分',
  },
};

const WORST_ACCESSORY: Record<FixtureKind, AccessoryItem> = {
  oweMoney: {
    ...FIXTURE_ACCESSORY.oweMoney,
    title: '付给Wan Nurul Aisyah binti Wan Abdul Rahman',
    amountSen: 1234560,
    sub: '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便买两杯 Tealive',
  },
  rideSoon: {
    ...FIXTURE_ACCESSORY.rideSoon,
    title: '23:45 → Pangsapuri Vista Harmoni Blok C · 59 分钟后集合',
    sub: 'Sunway Geo Residences 南门 Grab 上车点 · 6 人齐了',
  },
  owedToYou: {
    ...FIXTURE_ACCESSORY.owedToYou,
    title: '陈美玲 (Tan Mei Ling) 说已付你',
    amountSen: 50,
    sub: '帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte · 等你确认',
  },
  bountyInProgress: {
    ...FIXTURE_ACCESSORY.bountyInProgress,
    title: 'Christopher Alexander Montgomery III 在讲 MAT2023 Calculus II',
    sub: '明天下午 2:30 · Sunway University Library Level 3 讨论室 3.14',
  },
};

const ONE_ACCESSORY: Record<FixtureKind, AccessoryItem> = {
  oweMoney: {
    ...FIXTURE_ACCESSORY.oweMoney,
    title: '付给Jo',
    amountSen: 50,
    sub: '取件',
  },
  rideSoon: {
    ...FIXTURE_ACCESSORY.rideSoon,
    title: '9:05 → KL · 1 分钟后集合',
    sub: '门口 · 2 人',
  },
  owedToYou: {
    ...FIXTURE_ACCESSORY.owedToYou,
    title: 'J 说已付你',
    amountSen: 100,
    sub: '咖啡',
  },
  bountyInProgress: { ...FIXTURE_ACCESSORY.bountyInProgress, title: 'Jo 在讲题', sub: '今晚' },
};

const ACCESSORY_BY_VARIANT: Record<FixtureVariant, Record<FixtureKind, AccessoryItem>> = {
  demo: FIXTURE_ACCESSORY,
  worst: WORST_ACCESSORY,
  one: ONE_ACCESSORY,
  empty: FIXTURE_ACCESSORY,
};

export const FIXTURE_UNREAD_MESSAGES = 3;

const UNREAD_BY_VARIANT: Record<FixtureVariant, number> = {
  demo: FIXTURE_UNREAD_MESSAGES,
  worst: 1284,
  one: 1,
  empty: 0,
};

const FEED_ORDER: FixtureKind[] = ['bountyInProgress', 'owedToYou', 'rideSoon', 'oweMoney'];

export function fixtureLiveItems(
  selection: string | undefined,
  variant: FixtureVariant = 'demo',
): LiveItemsSnapshot {
  if (selection === 'none' || variant === 'empty') return EMPTY_LIVE_ITEMS;
  const chosen = selection ? selection.split(',').map((part) => part.trim()) : FEED_ORDER;
  const items = ACCESSORY_BY_VARIANT[variant];
  return {
    accessory: FEED_ORDER.filter((kind) => chosen.includes(kind)).map((kind) => items[kind]),
    unreadMessages: UNREAD_BY_VARIANT[variant],
  };
}
