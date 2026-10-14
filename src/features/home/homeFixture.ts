import type { FixtureVariant } from '@/lib/fixtureVariant';
import { FIXTURE_ACCESSORY } from '@/lib/liveItems';

import type { CardDetail } from './homeModel';

const DEMO_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    payee: '阿杰',
    amount: 15,
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
    amount: 8,
    note: '帮带一杯咖啡 · 今天下午',
    category: 'buy',
  },
  [FIXTURE_ACCESSORY.bountyInProgress.id]: {
    kind: 'bountyInProgress',
    helper: 'Aiman',
    when: '今晚 8 点 · 线上',
    title: '讲一下微积分作业',
    amount: 20,
    category: 'study',
  },
};

const WORST_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    payee: 'Wan Nurul Aisyah binti Wan Abdul Rahman',
    amount: 12345.6,
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
    amount: 0.5,
    note: '帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte（少冰、燕麦奶）· 今天下午 3:15',
    category: 'buy',
  },
  [FIXTURE_ACCESSORY.bountyInProgress.id]: {
    kind: 'bountyInProgress',
    helper: 'Christopher Alexander Montgomery III',
    when: '明天下午 2:30 · Sunway University Library Level 3 讨论室 3.14',
    title: 'MAT2023 Calculus II 第 7 次作业：Taylor 级数和分部积分 Q3–Q9（周五 23:59 截止）',
    amount: 1250,
    category: 'study',
  },
};

const ONE_DETAILS: Readonly<Record<string, CardDetail>> = {
  [FIXTURE_ACCESSORY.oweMoney.id]: {
    kind: 'oweMoney',
    payee: 'Jo',
    amount: 0.5,
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
    amount: 1,
    note: '咖啡',
    category: 'buy',
  },
  [FIXTURE_ACCESSORY.bountyInProgress.id]: {
    kind: 'bountyInProgress',
    helper: 'Jo',
    when: '今晚',
    title: '讲题',
    amount: 1,
    category: 'study',
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
