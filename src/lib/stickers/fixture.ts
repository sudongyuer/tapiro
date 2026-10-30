import type { BountyCategory } from './category';
import type { Sticker, StickerKind, StickerRole, StickerService } from './model';
import { WORST_NAME, WORST_TITLE } from './worstCase';

export const STICKER_FIXTURES = ['none', 'one', 'seven', 'worst'] as const;
export type StickerFixture = (typeof STICKER_FIXTURES)[number];

export function stickerFixture(value: string | undefined): StickerFixture {
  return STICKER_FIXTURES.find((fixture) => fixture === value) ?? 'none';
}

type Seed = {
  title: string;
  kind: StickerKind;
  role: StickerRole;
  name: string | null;
  category?: BountyCategory;
};

const SEVEN: Seed[] = [
  { title: '帮买奶茶', kind: 'bounty', role: 'payer', name: 'Lily', category: 'buy' },
  { title: '拼车回 YC', kind: 'ride', role: 'payee', name: '阿杰' },
  { title: '帮取快递', kind: 'bounty', role: 'payee', name: '小林', category: 'pickup' },
  { title: '帮忙排队领证件', kind: 'bounty', role: 'payer', name: 'Aiman', category: 'queue' },
  { title: '拼车去 Sunway', kind: 'ride', role: 'payer', name: null },
  { title: '帮带一杯咖啡', kind: 'bounty', role: 'payee', name: null, category: 'buy' },
  { title: '帮取快递', kind: 'bounty', role: 'payee', name: 'Hana' },
];

const WORST: Seed[] = [
  { title: WORST_TITLE, kind: 'bounty', role: 'payee', name: WORST_NAME, category: 'other' },
  { title: WORST_TITLE, kind: 'bounty', role: 'payer', name: WORST_NAME, category: 'buy' },
  {
    title: 'Pangsapuri Vista Harmoni Blok C → KLIA2 Terminal Ketibaan Antarabangsa',
    kind: 'ride',
    role: 'payer',
    name: WORST_NAME,
  },
  {
    title: 'Wan Nurul Aisyah binti Wan Abdul Rahman 的毕业论文打印和装订',
    kind: 'bounty',
    role: 'payee',
    name: null,
    category: 'study',
  },
  {
    title: '帮忙把行李从 Universiti Malaya Kolej Kediaman Kinabalu 搬到 Bandar Sunway',
    kind: 'bounty',
    role: 'payer',
    name: null,
    category: 'move',
  },
  { title: '陪诊', kind: 'bounty', role: 'payee', name: 'J', category: 'accompany' },
  {
    title: '帮忙在 Jabatan Imigresen Putrajaya 排队续签学生准证',
    kind: 'bounty',
    role: 'payee',
    name: WORST_NAME,
    category: 'handle',
  },
];

const SEEDS: Record<StickerFixture, Seed[]> = {
  none: [],
  one: [{ title: '帮带一杯咖啡', kind: 'bounty', role: 'payee', name: '小林', category: 'buy' }],
  seven: SEVEN,
  worst: WORST,
};

const earned = (index: number) => new Date(Date.UTC(2026, 9, 24 - index * 2, 4)).toISOString();

export type EarnInput = {
  paymentId: string;
  itemKind: StickerKind;
  category: BountyCategory | null;
  title: string;
  counterpartName?: string | null;
};

export function createFixtureStickerService(fixture: StickerFixture) {
  const stickers: Sticker[] = SEEDS[fixture].map((seed, index) => ({
    id: `fixture-sticker-${index}`,
    paymentId: `fixture-sticker-payment-${index}`,
    role: seed.role,
    itemKind: seed.kind,
    category: seed.category ?? null,
    art: null,
    title: seed.title,
    earnedAt: earned(index),
    counterpartName: seed.name,
  }));
  const service: StickerService & { earn(input: EarnInput): number } = {
    async list() {
      return [...stickers];
    },
    earn({ counterpartName = null, ...input }) {
      if (!stickers.some((sticker) => sticker.paymentId === input.paymentId))
        stickers.unshift({
          id: `fixture-sticker-${input.paymentId}`,
          ...input,
          art: null,
          role: 'payee',
          counterpartName,
          earnedAt: new Date().toISOString(),
        });
      return stickers.length;
    },
  };
  return service;
}
