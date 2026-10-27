import type { BountyCategory, Sticker, StickerKind, StickerService } from './model';

export const STICKER_FIXTURES = ['none', 'one', 'seven', 'worst'] as const;
export type StickerFixture = (typeof STICKER_FIXTURES)[number];

export function stickerFixture(value: string | undefined): StickerFixture {
  return STICKER_FIXTURES.find((fixture) => fixture === value) ?? 'none';
}

type Seed = [title: string, kind: StickerKind, category?: BountyCategory];

const SEVEN: Seed[] = [
  ['帮买奶茶', 'bounty', 'buy'],
  ['拼车回 YC', 'ride'],
  ['帮取快递', 'bounty', 'pickup'],
  ['帮忙排队领证件', 'bounty', 'queue'],
  ['拼车去 Sunway', 'ride'],
  ['帮带一杯咖啡', 'bounty', 'buy'],
  ['帮取快递', 'bounty'],
];

const WORST: Seed[] = [
  ['帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便买两杯 Tealive', 'bounty', 'other'],
  ['Pangsapuri Vista Harmoni Blok C → KLIA2 Terminal Ketibaan Antarabangsa', 'ride'],
  ['Wan Nurul Aisyah binti Wan Abdul Rahman 的毕业论文打印和装订', 'bounty', 'study'],
  ['帮忙在 Sunway Pyramid 的 ZUS Coffee 带一杯 Spanish Latte', 'bounty', 'buy'],
  ['帮忙把行李从 Universiti Malaya Kolej Kediaman Kinabalu 搬到 Bandar Sunway', 'bounty', 'move'],
  ['陪诊', 'bounty', 'accompany'],
  ['帮忙在 Jabatan Imigresen Putrajaya 排队续签学生准证', 'bounty', 'handle'],
];

const SEEDS: Record<StickerFixture, Seed[]> = {
  none: [],
  one: [['帮带一杯咖啡', 'bounty', 'buy']],
  seven: SEVEN,
  worst: WORST,
};

const earned = (index: number) => new Date(Date.UTC(2026, 9, 24 - index * 2, 4)).toISOString();

export type EarnInput = {
  paymentId: string;
  itemKind: StickerKind;
  category: BountyCategory | null;
  title: string;
};

export function createFixtureStickerService(fixture: StickerFixture) {
  const stickers: Sticker[] = SEEDS[fixture].map(([title, itemKind, category], index) => ({
    id: `fixture-sticker-${index}`,
    paymentId: `fixture-sticker-payment-${index}`,
    itemKind,
    category: category ?? null,
    title,
    earnedAt: earned(index),
  }));
  const service: StickerService & { earn(input: EarnInput): number } = {
    async list() {
      return [...stickers];
    },
    earn(input) {
      if (!stickers.some((sticker) => sticker.paymentId === input.paymentId))
        stickers.unshift({
          id: `fixture-sticker-${input.paymentId}`,
          ...input,
          earnedAt: new Date().toISOString(),
        });
      return stickers.length;
    },
  };
  return service;
}
