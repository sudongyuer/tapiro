import type { FixtureVariant } from '@/lib/fixtureVariant';

import type { PostService, PublishArgs, PublishOutcome, UnpaidSummary } from './types';

export const POST_COSTS = ['free', 'last', 'coin', 'none'] as const;
export const UNPAID_MIXES = ['none', 'two', 'old'] as const;
export const PUBLISH_MODES = ['ok', 'failOnce', 'fail', 'alreadySent'] as const;

export type PostCost = (typeof POST_COSTS)[number];
export type UnpaidMix = (typeof UNPAID_MIXES)[number];
export type PublishMode = (typeof PUBLISH_MODES)[number];

export type FixturePostOptions = {
  cost: PostCost;
  unpaid: UnpaidMix;
  publish: PublishMode;
  statusFail: boolean;
  draftSent: boolean;
  variant: FixtureVariant;
  now: () => Date;
};

export const FIXTURE_UNPAID_IDS = { first: 'fixture-owe', second: 'fixture-owe-second' } as const;

const DAY_MS = 86_400_000;
const PER_MONTH = 3;

function pick<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.find((candidate) => candidate === value) ?? fallback;
}

export function fixturePostOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
  now: () => Date = () => new Date(),
): FixturePostOptions {
  return {
    cost: pick(POST_COSTS, argument('uiVerifyPostCost'), 'free'),
    unpaid: pick(UNPAID_MIXES, argument('uiVerifyUnpaid'), 'none'),
    publish: pick(PUBLISH_MODES, argument('uiVerifyPublish'), 'ok'),
    statusFail: argument('uiVerifyStatusFail') === '1',
    draftSent: argument('uiVerifyDraftSent') === '1',
    variant,
    now,
  };
}

const BALANCES: Record<PostCost, { freePostsLeft: number; coins: number }> = {
  free: { freePostsLeft: 2, coins: 0 },
  last: { freePostsLeft: 1, coins: 0 },
  coin: { freePostsLeft: 0, coins: 4 },
  none: { freePostsLeft: 0, coins: 0 },
};

const PEOPLE: Record<FixtureVariant, [[string, number], [string, number]]> = {
  demo: [
    ['阿杰', 1500],
    ['Lily', 600],
  ],
  empty: [
    ['阿杰', 1500],
    ['Lily', 600],
  ],
  one: [
    ['Jo', 100],
    ['J', 100],
  ],
  worst: [
    ['Wan Nurul Aisyah binti Wan Abdul Rahman', 1234560],
    ['陈美玲 (Tan Mei Ling) · Sunway Geo Residence', 1234560],
  ],
};

function unpaidFor(options: FixturePostOptions): UnpaidSummary[] {
  if (options.unpaid === 'none') return [];
  const [first, second] = PEOPLE[options.variant];
  const ago = (days: number) => new Date(options.now().getTime() - days * DAY_MS).toISOString();
  const oldest = {
    paymentId: FIXTURE_UNPAID_IDS.first,
    payeeName: first[0],
    amountSen: first[1],
    createdAt: ago(options.unpaid === 'old' ? 8 : 3),
  };
  if (options.unpaid === 'old') return [oldest];
  return [
    oldest,
    {
      paymentId: FIXTURE_UNPAID_IDS.second,
      payeeName: second[0],
      amountSen: second[1],
      createdAt: ago(1),
    },
  ];
}

function nextMonthInMalaysia(now: Date) {
  const local = new Date(now.getTime() + 8 * 3_600_000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 8 * 3_600_000,
  ).toISOString();
}

export type FixturePostService = PostService & { published(): string[] };

export function createFixturePostService(
  options: FixturePostOptions,
  onPublished: (args: PublishArgs) => void = () => {},
): FixturePostService {
  const balance = { ...BALANCES[options.cost] };
  const accepted = new Map<string, PublishOutcome>();
  let statusFailures = options.statusFail ? 1 : 0;
  let sentId: string | null = null;
  let publishFailures = options.publish === 'failOnce' ? 1 : 0;

  return {
    async status() {
      if (statusFailures > 0) {
        statusFailures -= 1;
        throw new TypeError('Network request failed');
      }
      const unpaid = unpaidFor(options);
      return {
        blocked: unpaid.length > 0,
        unpaid,
        coins: balance.coins,
        freePostsLeft: balance.freePostsLeft,
        freePostsPerMonth: PER_MONTH,
        nextFreeAt: nextMonthInMalaysia(options.now()),
      };
    },
    async publish(args) {
      const first = accepted.get(args.id);
      if (first) return first;
      if (options.publish === 'fail') return { ok: false, reason: 'failed' };
      if (options.publish === 'alreadySent') return { ok: false, reason: 'alreadySent' };
      if (publishFailures > 0) {
        publishFailures -= 1;
        return { ok: false, reason: 'failed' };
      }
      if (options.unpaid !== 'none') return { ok: false, reason: 'blocked' };
      if (balance.freePostsLeft === 0 && balance.coins === 0) {
        return { ok: false, reason: 'noBalance' };
      }
      const charge = balance.freePostsLeft > 0 ? 'free' : 'coin';
      if (charge === 'free') balance.freePostsLeft -= 1;
      else balance.coins -= 1;
      const outcome: PublishOutcome = {
        ok: true,
        result: {
          id: args.id,
          status: 'open',
          charge,
          expiresAt:
            args.deadline_at ?? new Date(options.now().getTime() + 7 * DAY_MS).toISOString(),
        },
      };
      accepted.set(args.id, outcome);
      onPublished(args);
      return outcome;
    },
    async isPublished(id) {
      if (options.draftSent && sentId === null) sentId = id;
      return accepted.has(id) || id === sentId;
    },
    published: () => [...accepted.keys()],
  };
}
