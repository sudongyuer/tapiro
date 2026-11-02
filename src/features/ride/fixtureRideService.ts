import type { FixtureVariant } from '@/lib/fixtureVariant';

import {
  FIXTURE_SHORT_NAMES,
  fixtureHistory,
  fixtureRideList,
  RIDE_LISTS,
  type RideListFixture,
} from './fixtureRides';
import { malaysiaDayKey } from './rideClock';
import type { MyRide, PublishRideArgs, RidePostStatus, RideService } from './types';

export const RIDE_FAILS = ['none', 'first', 'refresh'] as const;
export const RIDE_COSTS = ['free', 'coin', 'none', 'blocked'] as const;
export const RIDE_PUBLISHES = ['ok', 'fail', 'alreadySent'] as const;

export type FixtureRideOptions = {
  list: RideListFixture;
  fail: (typeof RIDE_FAILS)[number];
  cost: (typeof RIDE_COSTS)[number];
  payee: boolean;
  publish: (typeof RIDE_PUBLISHES)[number];
  variant: FixtureVariant;
  now: () => number;
  delayMs: number;
};

function pick<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.find((candidate) => candidate === value) ?? fallback;
}

export function fixtureRideOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
): FixtureRideOptions {
  return {
    list: pick(RIDE_LISTS, argument('uiVerifyRides'), 'demo'),
    fail: pick(RIDE_FAILS, argument('uiVerifyRideFail'), 'none'),
    cost: pick(RIDE_COSTS, argument('uiVerifyRideCost'), 'free'),
    payee: argument('uiVerifyRidePayee') !== 'none',
    publish: pick(RIDE_PUBLISHES, argument('uiVerifyRidePublish'), 'ok'),
    variant,
    now: () => Date.now(),
    delayMs: 300,
  };
}

const STATUS: Record<
  FixtureRideOptions['cost'],
  Omit<RidePostStatus, 'hasPayee' | 'nextFreeAt'>
> = {
  free: { blocked: false, coins: 0, freePostsLeft: 2, freePostsPerMonth: 3 },
  coin: { blocked: false, coins: 4, freePostsLeft: 0, freePostsPerMonth: 3 },
  none: { blocked: false, coins: 0, freePostsLeft: 0, freePostsPerMonth: 3 },
  blocked: { blocked: true, coins: 4, freePostsLeft: 2, freePostsPerMonth: 3 },
};

function publishedRide(args: PublishRideArgs): MyRide {
  const departs = Date.parse(args.depart_at);
  return {
    id: args.id,
    start: { label: args.start_label, short: args.start_short, kind: null },
    dest: { label: args.dest_label, short: args.dest_short, kind: null },
    departAt: new Date(departs).toISOString(),
    revisedAt: null,
    day: malaysiaDayKey(departs),
    status: 'open',
    seats: args.seats,
    taken: 1,
    splitMode: args.split_mode,
    myShare: null,
    myPaid: null,
    estimate:
      args.estimate_minor === null ? null : { minor: args.estimate_minor, currency: args.currency },
    airport: args.flight_departs_at !== null,
    flightDepartsAt: args.flight_departs_at,
    largeBags: args.large_bags,
    settledAt: null,
    organiserName: null,
    role: 'organiser',
    myStatus: 'accepted',
    pendingRequests: 0,
  };
}

export function createFixtureRideService(
  options: FixtureRideOptions,
  onPublished: (args: PublishRideArgs) => void = () => {},
): RideService {
  let loads = 0;
  const published: MyRide[] = [];
  const wait = () => new Promise((resolve) => setTimeout(resolve, options.delayMs));
  const listFails = () =>
    (options.fail === 'first' && loads === 1) || (options.fail === 'refresh' && loads > 1);

  return {
    async nearby() {
      await wait();
      if (listFails()) throw new Error('fixture: rides failed');
      return {
        items: fixtureRideList(options.list, options.variant, options.now()).joinable,
        next: null,
      };
    },
    async mine() {
      loads += 1;
      await wait();
      if (listFails()) throw new Error('fixture: rides failed');
      const data = fixtureRideList(options.list, options.variant, options.now());
      return { items: [...published, ...data.mine], historyCount: data.historyCount };
    },
    async history() {
      await wait();
      return fixtureHistory(options.now());
    },
    async shortNames() {
      return FIXTURE_SHORT_NAMES;
    },
    async postStatus() {
      await wait();
      return {
        ...STATUS[options.cost],
        nextFreeAt: new Date(options.now() + 10 * 86_400_000).toISOString(),
        hasPayee: options.payee,
      };
    },
    async publish(args) {
      await wait();
      if (options.publish === 'fail') return { ok: false, reason: 'failed' };
      if (options.publish === 'alreadySent') return { ok: false, reason: 'alreadySent' };
      if (!options.payee) return { ok: false, reason: 'noPayee' };
      onPublished(args);
      published.unshift(publishedRide(args));
      return { ok: true, id: args.id, charge: options.cost === 'coin' ? 'coin' : 'free' };
    },
  };
}
