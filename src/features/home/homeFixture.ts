import type { FixtureVariant } from '@/lib/fixtureVariant';
import { FIXTURE_ACCESSORY, type CardDetail } from '@/lib/liveItems';

const DEMO_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    paymentId: null,
    payee: '阿杰',
    amountSen: 1500,
    note: '阿杰 10 分钟前送到 · 帮取快递',
    category: 'pickup',
  },
  [FIXTURE_ACCESSORY.rideSoon.id]: {
    kind: 'rideSoon',
    departAt: '17:00',
    route: '校门口 → YC',
    countdown: '08:42',
    minutesLeft: 8,
    seats: '4/4',
    youBook: true,
    meet: 'Sunway Geo',
    destination: 'YC 宿舍',
    progress: 0.36,
    riders: ['M', '杰', 'H', '林'],
  },
  [FIXTURE_ACCESSORY.owedToYou.id]: {
    kind: 'owedToYou',
    payer: '小林',
    amountSen: 800,
    note: '帮带一杯咖啡 · 今天下午',
    category: 'buy',
  },
};

const WORST_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    paymentId: null,
    payee: 'Wan Nurul Aisyah binti Wan Abdul Rahman',
    amountSen: 1234560,
    note: '2 小时前送到 · 帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便买两杯 Tealive 珍珠奶茶',
    category: 'pickup',
  },
  [FIXTURE_ACCESSORY.rideSoon.id]: {
    kind: 'rideSoon',
    departAt: '23:45',
    route: 'Sunway Geo Residences 南门 → Pangsapuri Vista Harmoni Blok C',
    countdown: '59:58',
    minutesLeft: 59,
    seats: '6/6',
    youBook: true,
    meet: 'Sunway Geo Residences 南门 Grab 上车点',
    destination: 'Pangsapuri Vista Harmoni Blok C, Jalan PJS 7/19',
    progress: 0.98,
    riders: ['W', '陈', 'C', 'Ó', '欧', 'M'],
  },
  [FIXTURE_ACCESSORY.owedToYou.id]: {
    kind: 'owedToYou',
    payer: '陈美玲 (Tan Mei Ling)',
    amountSen: 50,
    note: '帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte（少冰、燕麦奶）· 今天下午 3:15',
    category: 'buy',
  },
};

const ONE_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    paymentId: null,
    payee: 'Jo',
    amountSen: 50,
    note: '取件',
    category: 'pickup',
  },
  [FIXTURE_ACCESSORY.rideSoon.id]: {
    kind: 'rideSoon',
    departAt: '9:05',
    route: 'KL',
    countdown: '00:58',
    minutesLeft: 1,
    seats: '2/2',
    youBook: false,
    meet: '门口',
    destination: 'KL',
    progress: 0,
    riders: ['J', 'Jo'],
  },
  [FIXTURE_ACCESSORY.owedToYou.id]: {
    kind: 'owedToYou',
    payer: 'J',
    amountSen: 100,
    note: '咖啡',
    category: 'buy',
  },
};

const DETAILS_BY_VARIANT: Record<FixtureVariant, Readonly<Record<string, CardDetail>>> = {
  demo: DEMO_DETAILS,
  worst: WORST_DETAILS,
  one: ONE_DETAILS,
  empty: DEMO_DETAILS,
};

export function fixtureCardDetails(variant: FixtureVariant) {
  return DETAILS_BY_VARIANT[variant];
}
