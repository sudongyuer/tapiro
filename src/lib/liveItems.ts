import type { FixtureVariant } from './fixtureVariant';
import type { BountyCategory } from './stickers';
import { createStore } from './store';

export const ACCESSORY_KINDS = [
  'oweMoney',
  'rideSoon',
  'owedToYou',
  'bountyAction',
  'bountyInProgress',
  'waitingConfirm',
] as const;
export type AccessoryKind = (typeof ACCESSORY_KINDS)[number];

export type PayDetail = {
  kind: 'oweMoney';
  paymentId: string | null;
  payee: string;
  amountSen: number;
  note: string;
  category: BountyCategory;
};

export type RideDetail = {
  kind: 'rideSoon';
  departAt: string;
  route: string;
  countdown: string;
  minutesLeft: number;
  seats: string;
  youBook: boolean;
  meet: string;
  destination: string;
  progress: number;
  riders: readonly string[];
};

export type OwedDetail = {
  kind: 'owedToYou';
  payer: string;
  amountSen: number;
  note: string;
  category: BountyCategory;
};

export const BOUNTY_CARD_KINDS = ['bountyAction', 'bountyInProgress', 'waitingConfirm'] as const;
export type BountyCardKind = (typeof BOUNTY_CARD_KINDS)[number];

export type BountyCardDetail = {
  kind: BountyCardKind;
  role: 'poster' | 'helper' | 'applicant';
  bountyId: string;
  title: string;
  category: BountyCategory;
  rewardSen: number;
  counterpart: string | null;
  line: string;
  actionLabel?: string;
  target: string;
  oneTime?: 'not_selected' | 'expired';
  markSeen?: () => Promise<void>;
};

export type CardDetail = PayDetail | RideDetail | OwedDetail | BountyCardDetail;

export type AccessoryItem = {
  id: string;
  kind: AccessoryKind;
  title: string;
  amountSen?: number;
  sub: string;
  payment?: { id: string; counterpart: string; note: string };
  bounty?: BountyCardDetail;
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

type FixtureName =
  | 'oweMoney'
  | 'rideSoon'
  | 'owedToYou'
  | 'bountyAction'
  | 'bountyInProgress'
  | 'bountyWaiting'
  | 'bountyOneTime';
type BountyFixtureName = Extract<
  FixtureName,
  'bountyAction' | 'bountyInProgress' | 'bountyWaiting' | 'bountyOneTime'
>;

function bountyItem(id: string, bounty: BountyCardDetail): AccessoryItem {
  return { id, kind: bounty.kind, title: bounty.title, sub: bounty.line, bounty };
}

const DEMO_BOUNTY: Record<BountyFixtureName, BountyCardDetail> = {
  bountyAction: {
    kind: 'bountyAction',
    role: 'poster',
    bountyId: 'fixture-bounty-01',
    title: '帮取快递',
    category: 'pickup',
    rewardSen: 800,
    counterpart: null,
    line: '3 人申请，去选',
    actionLabel: '去选人',
    target: '/bounty/applicants/fixture-bounty-01',
  },
  bountyInProgress: {
    kind: 'bountyInProgress',
    role: 'poster',
    bountyId: 'fixture-bounty-04',
    title: '讲一下微积分作业',
    category: 'study',
    rewardSen: 2000,
    counterpart: 'Aiman',
    line: 'Aiman在路上 · 20:00 到',
    target: '/bounty/status/fixture-bounty-04',
  },
  bountyWaiting: {
    kind: 'waitingConfirm',
    role: 'poster',
    bountyId: 'fixture-bounty-03',
    title: '搬桌子',
    category: 'move',
    rewardSen: 1500,
    counterpart: null,
    line: '等人申请',
    target: '/bounty/applicants/fixture-bounty-03',
  },
  bountyOneTime: {
    kind: 'waitingConfirm',
    role: 'applicant',
    bountyId: 'fixture-bounty-02',
    title: '帮带奶茶',
    category: 'buy',
    rewardSen: 600,
    counterpart: '小林',
    line: '这次没选上',
    target: '/bounty/fixture-bounty-02',
    oneTime: 'not_selected',
  },
};

const LONG_NAME = 'Christopher Alexander Montgomery III';

const WORST_BOUNTY: Record<BountyFixtureName, BountyCardDetail> = {
  bountyAction: {
    ...DEMO_BOUNTY.bountyAction,
    title: '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便买两杯 Tealive 珍珠奶茶',
    rewardSen: 1234560,
    counterpart: LONG_NAME,
    line: `${LONG_NAME}说做完了 · 去确认`,
    actionLabel: '去确认',
  },
  bountyInProgress: {
    ...DEMO_BOUNTY.bountyInProgress,
    title: 'MAT2023 Calculus II 第 7 次作业：Taylor 级数和分部积分 Q3–Q9（周五 23:59 截止）',
    rewardSen: 125000,
    counterpart: LONG_NAME,
    line: `${LONG_NAME}在路上 · 23:45 到`,
  },
  bountyWaiting: {
    ...DEMO_BOUNTY.bountyWaiting,
    title: '帮忙把两张书桌从 Sunway Geo Residences 搬到 Pangsapuri Vista Harmoni Blok C',
    rewardSen: 50,
    line: '等人申请',
  },
  bountyOneTime: {
    ...DEMO_BOUNTY.bountyOneTime,
    title: '帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte（少冰、燕麦奶）',
    counterpart: '陈美玲 (Tan Mei Ling)',
  },
};

const ONE_BOUNTY: Record<BountyFixtureName, BountyCardDetail> = {
  bountyAction: {
    ...DEMO_BOUNTY.bountyAction,
    title: '取件',
    rewardSen: 100,
    line: '1 人申请，去选',
  },
  bountyInProgress: {
    ...DEMO_BOUNTY.bountyInProgress,
    title: '讲题',
    rewardSen: 100,
    counterpart: 'Jo',
    line: 'Jo在路上 · 9:05 到',
  },
  bountyWaiting: { ...DEMO_BOUNTY.bountyWaiting, title: '搬', rewardSen: 100 },
  bountyOneTime: { ...DEMO_BOUNTY.bountyOneTime, title: '奶茶', counterpart: 'J' },
};

const BOUNTY_IDS: Record<BountyFixtureName, string> = {
  bountyAction: 'fixture-bounty-action',
  bountyInProgress: 'fixture-progress',
  bountyWaiting: 'fixture-bounty-waiting',
  bountyOneTime: 'fixture-bounty-one-time',
};

function bountyItems(details: Record<BountyFixtureName, BountyCardDetail>) {
  return {
    bountyAction: bountyItem(BOUNTY_IDS.bountyAction, details.bountyAction),
    bountyInProgress: bountyItem(BOUNTY_IDS.bountyInProgress, details.bountyInProgress),
    bountyWaiting: bountyItem(BOUNTY_IDS.bountyWaiting, details.bountyWaiting),
    bountyOneTime: bountyItem(BOUNTY_IDS.bountyOneTime, details.bountyOneTime),
  };
}

export const FIXTURE_ACCESSORY: Record<FixtureName, AccessoryItem> = {
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
  ...bountyItems(DEMO_BOUNTY),
};

const WORST_ACCESSORY: Record<FixtureName, AccessoryItem> = {
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
  ...bountyItems(WORST_BOUNTY),
};

const ONE_ACCESSORY: Record<FixtureName, AccessoryItem> = {
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
  ...bountyItems(ONE_BOUNTY),
};

const ACCESSORY_BY_VARIANT: Record<FixtureVariant, Record<FixtureName, AccessoryItem>> = {
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

const FEED_ORDER: FixtureName[] = [
  'bountyOneTime',
  'bountyWaiting',
  'bountyInProgress',
  'owedToYou',
  'bountyAction',
  'rideSoon',
  'oweMoney',
];
const DEFAULT_FEED: FixtureName[] = ['bountyInProgress', 'owedToYou', 'rideSoon', 'oweMoney'];

export function fixtureLiveItems(
  selection: string | undefined,
  variant: FixtureVariant = 'demo',
  markSeen?: (bountyId: string) => Promise<void>,
): LiveItemsSnapshot {
  if (selection === 'none' || variant === 'empty') return EMPTY_LIVE_ITEMS;
  const chosen = selection ? selection.split(',').map((part) => part.trim()) : DEFAULT_FEED;
  const items = ACCESSORY_BY_VARIANT[variant];
  return {
    accessory: FEED_ORDER.filter((name) => chosen.includes(name)).map((name) =>
      withMarkSeen(items[name], markSeen),
    ),
    unreadMessages: UNREAD_BY_VARIANT[variant],
  };
}

function withMarkSeen(
  item: AccessoryItem,
  markSeen: ((bountyId: string) => Promise<void>) | undefined,
): AccessoryItem {
  const { bounty } = item;
  if (!bounty?.oneTime || !markSeen) return item;
  return { ...item, bounty: { ...bounty, markSeen: () => markSeen(bounty.bountyId) } };
}
