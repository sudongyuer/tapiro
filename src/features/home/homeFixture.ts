import { FIXTURE_ACCESSORY } from '@/features/shell';

import type { CardDetail } from './homeModel';

export const FIXTURE_CARD_DETAILS: Readonly<Record<string, CardDetail>> = {
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
