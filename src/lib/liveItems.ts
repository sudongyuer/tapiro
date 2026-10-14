import { createStore } from './store';

export const ACCESSORY_KINDS = ['oweMoney', 'rideSoon', 'owedToYou', 'bountyInProgress'] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export type AccessoryItem = {
  id: string;
  kind: AccessoryKind;
  title: string;
  sub: string;
};

export function accessoryPriority(kind: AccessoryKind) {
  return ACCESSORY_KINDS.indexOf(kind) + 1;
}

export type LiveItemsSnapshot = {
  accessory: readonly AccessoryItem[];
  unreadMessages: number;
};

export type LiveItems = {
  getSnapshot: () => LiveItemsSnapshot;
  subscribe: (listener: () => void) => () => void;
  publish: (next: LiveItemsSnapshot) => void;
};

export const EMPTY_LIVE_ITEMS: LiveItemsSnapshot = { accessory: [], unreadMessages: 0 };

export function createLiveItems(initial: LiveItemsSnapshot = EMPTY_LIVE_ITEMS): LiveItems {
  const store = createStore(initial);
  return { getSnapshot: store.get, subscribe: store.subscribe, publish: store.set };
}

export const FIXTURE_ACCESSORY: Record<AccessoryKind, AccessoryItem> = {
  oweMoney: {
    id: 'fixture-owe',
    kind: 'oweMoney',
    title: '付给阿杰 RM 15',
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
    title: '小林说已付你 RM 8',
    sub: '帮带一杯咖啡 · 等你确认',
  },
  bountyInProgress: {
    id: 'fixture-progress',
    kind: 'bountyInProgress',
    title: 'Aiman 在讲微积分',
    sub: '今晚 8 点 · 微积分',
  },
};

export const FIXTURE_UNREAD_MESSAGES = 3;

const FEED_ORDER: AccessoryKind[] = ['bountyInProgress', 'owedToYou', 'rideSoon', 'oweMoney'];

export function fixtureLiveItems(selection: string | undefined): LiveItemsSnapshot {
  if (selection === 'none') return EMPTY_LIVE_ITEMS;
  const chosen = selection ? selection.split(',').map((part) => part.trim()) : FEED_ORDER;
  return {
    accessory: FEED_ORDER.filter((kind) => chosen.includes(kind)).map(
      (kind) => FIXTURE_ACCESSORY[kind],
    ),
    unreadMessages: FIXTURE_UNREAD_MESSAGES,
  };
}
