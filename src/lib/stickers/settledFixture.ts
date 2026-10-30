import type { Money } from '@/lib/money';

import type { CollectResult, SettledRow, SettledService } from './settled';
import { WORST_NAME, WORST_TITLE } from './worstCase';

export const SETTLED_FIXTURES = ['none', 'one', 'two', 'behind', 'worst'] as const;
export type SettledFixture = (typeof SETTLED_FIXTURES)[number];

export function settledFixture(value: string | undefined): SettledFixture {
  return SETTLED_FIXTURES.find((fixture) => fixture === value) ?? 'none';
}

type Seed = Pick<SettledRow, 'itemKind' | 'category' | 'title' | 'counterpartName' | 'amount'>;

const myr = (minor: number): Money => ({ minor, currency: 'MYR' });
const cny = (minor: number): Money => ({ minor, currency: 'CNY' });

const PARCEL: Seed = {
  itemKind: 'bounty',
  category: 'pickup',
  title: '帮取快递',
  counterpartName: '阿杰',
  amount: myr(1500),
};

const TEA: Seed = {
  itemKind: 'bounty',
  category: 'buy',
  title: '帮买奶茶',
  counterpartName: 'Lily',
  amount: cny(3000),
};

const SEEDS: Record<SettledFixture, Seed[]> = {
  none: [],
  one: [PARCEL],
  two: [TEA, PARCEL],
  behind: [{ ...TEA, amount: myr(800) }],
  worst: [
    {
      itemKind: 'bounty',
      category: 'other',
      title: WORST_TITLE,
      counterpartName: WORST_NAME,
      amount: myr(50000),
    },
    {
      itemKind: 'bounty',
      category: 'move',
      title: WORST_TITLE,
      counterpartName: null,
      amount: cny(80000),
    },
    {
      itemKind: 'ride',
      category: null,
      title: WORST_TITLE,
      counterpartName: WORST_NAME,
      amount: myr(1234560),
    },
  ],
};

const HOUR_MS = 3_600_000;

export type FixtureSettledOptions = {
  fixture: SettledFixture;
  now?: () => Date;
  onCollect?: (stickerIds: string[]) => void;
};

export const fixtureSettledStickerId = (index: number) => `fixture-settled-${index}`;

export function createFixtureSettledService({
  fixture,
  now = () => new Date(),
  onCollect,
}: FixtureSettledOptions): SettledService {
  const collected: string[] = [];
  const rows = () =>
    SEEDS[fixture].map((seed, index) => ({
      ...seed,
      art: null,
      stickerId: fixtureSettledStickerId(index),
      paymentId: `fixture-settled-payment-${index}`,
      earnedAt: new Date(now().getTime() - (index + 1) * HOUR_MS).toISOString(),
    }));
  return {
    async list() {
      return rows().filter((row) => !collected.includes(row.stickerId));
    },
    async collect(stickerId): Promise<CollectResult> {
      if (!rows().some((row) => row.stickerId === stickerId)) return 'notFound';
      collected.push(stickerId);
      onCollect?.([...collected]);
      return 'collected';
    },
  };
}
