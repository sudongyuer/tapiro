import type { FixtureVariant } from '@/lib/fixtureVariant';
import type { CurrencyCode } from '@/lib/money';
import { addDays, localDayKey, localTimeOn } from '@/lib/deviceClock';

import type { MyRide, RideListData, RidePlace, RideSummary, ShortNameRow } from './types';

export const RIDE_LISTS = ['demo', 'empty', 'joinable', 'history', 'settled'] as const;
export type RideListFixture = (typeof RIDE_LISTS)[number];

export const FIXTURE_SHORT_NAMES: ShortNameRow[] = [
  ['klia', 'KLIA', 'airport'],
  ['klia1', 'KLIA', 'airport'],
  ['klia terminal 1', 'KLIA', 'airport'],
  ['kuala lumpur international airport', 'KLIA', 'airport'],
  ['klia2', 'KLIA2', 'airport'],
  ['klia 2', 'KLIA2', 'airport'],
  ['klia terminal 2', 'KLIA2', 'airport'],
  ['kuala lumpur international airport terminal 2', 'KLIA2', 'airport'],
  ['subang airport', '梳邦机场', 'airport'],
  ['sunway geo', '双威', 'home'],
  ['sunway pyramid', '双威金字塔', 'mall'],
  ['sunway university', '双威大学', 'campus'],
  ['mid valley megamall', '谷中城', 'mall'],
  ['mid valley', '谷中城', 'mall'],
  ['pavilion kuala lumpur', '柏威年', 'mall'],
  ["taylor's university", '泰莱大学', 'campus'],
].map(([pattern, shortName, kind]) => ({
  pattern,
  shortName,
  kind: kind as ShortNameRow['kind'],
}));

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const place = (label: string, short: string, kind: RidePlace['kind'] = null): RidePlace => ({
  label,
  short,
  kind,
});

type Seed = Partial<RideSummary> & Pick<RideSummary, 'id' | 'start' | 'dest' | 'departAt'>;

function ride(seed: Seed, currency: CurrencyCode = 'MYR', estimateMinor: number | null = null) {
  return {
    revisedAt: null,
    status: 'open',
    seats: 4,
    taken: 1,
    splitMode: 'tapiro',
    estimate: estimateMinor === null ? null : { minor: estimateMinor, currency },
    airport: false,
    flightDepartsAt: null,
    largeBags: null,
    settledAt: null,
    organiserName: '小林',
    ...seed,
  } satisfies RideSummary;
}

const iso = (time: number) => new Date(time).toISOString();

const longText = (seed: string, count: number) =>
  [...seed.repeat(Math.ceil(count / [...seed].length))].slice(0, count).join('');

function at(now: number, dayOffset: number, hours: number, minutes: number) {
  return localTimeOn(addDays(localDayKey(now), dayOffset), hours, minutes);
}

function demo(now: number, variant: FixtureVariant): RideListData {
  const worst = variant === 'worst';
  const longLabel = longText(
    'Sunway Pyramid Convention Centre 旁边的 Sunway Lagoon 正门售票处，',
    80,
  );
  const leaving: MyRide = {
    ...ride(
      {
        id: 'ride-leaving',
        start: worst
          ? place(longLabel, '谷中城北庭正门口')
          : place('Sunway Pyramid 正门', 'Pyramid', 'mall'),
        dest: worst ? place(longLabel, '吉隆坡第二机场站') : place('YC Residence', 'YC'),
        departAt: iso(now + 8 * MINUTE),
        status: 'gathering',
        taken: 3,
      },
      'MYR',
      worst ? 100_000 : 1_600,
    ),
    role: 'member',
    myStatus: 'accepted',
    pendingRequests: 0,
    myShare: null,
    myPaid: null,
    myDueSince: null,
    eta: null,
  };
  const requests: MyRide = {
    ...ride(
      {
        id: 'ride-requests',
        start: place('Sunway Geo Residences', 'Geo', 'home'),
        dest: place('Pavilion Kuala Lumpur', 'Pavilion', 'mall'),
        departAt: iso(at(now, 1, 10, 30)),
        seats: worst ? 2 : 4,
      },
      worst ? 'CNY' : 'MYR',
      worst ? 160_000 : 4_800,
    ),
    role: 'organiser',
    myStatus: 'accepted',
    pendingRequests: 1,
    myShare: null,
    myPaid: null,
    myDueSince: null,
    eta: null,
  };
  const joinable = [
    ride(
      {
        id: 'ride-full',
        start: place('Sunway Pyramid 正门', 'Pyramid', 'mall'),
        dest: place("Taylor's Lakeside", "Taylor's"),
        departAt: iso(now + 50 * MINUTE),
        seats: 3,
        taken: 3,
      },
      'MYR',
      1_800,
    ),
    ride(
      {
        id: 'ride-airport',
        start: place('Sunway Geo Residences', '双威', 'home'),
        dest: place('KLIA2 第 2 航站楼', 'KLIA2', 'airport'),
        departAt: iso(at(now, 1, 6, 30)),
        airport: true,
        flightDepartsAt: iso(at(now, 1, 9, 10)),
        largeBags: worst ? 9 : 2,
        seats: 3,
        taken: 2,
      },
      'MYR',
      7_600,
    ),
    ride(
      {
        id: 'ride-mall',
        start: place('Mid Valley Megamall North Court', 'Mid Valley', 'mall'),
        dest: place('Sunway Geo', '双威', 'home'),
        departAt: iso(at(now, 1, 13, 0)),
      },
      'MYR',
      3_600,
    ),
  ];
  return { mine: [leaving, requests], joinable, historyCount: 2, next: null };
}

export function fixtureRideList(
  list: RideListFixture,
  variant: FixtureVariant,
  now: number,
): RideListData {
  const full = demo(now, variant);
  if (list === 'empty') return { mine: [], joinable: [], historyCount: 0, next: null };
  if (list === 'joinable') return { ...full, mine: [], historyCount: 0 };
  if (list === 'history') return { mine: [], joinable: [], historyCount: 3, next: null };
  if (list === 'settled') return { ...full, mine: [full.mine[0], settledTicket(now)] };
  return full;
}

function settledTicket(now: number): MyRide {
  return {
    ...ride(
      {
        id: 'ride-settled',
        start: place('Sunway Geo', 'Geo', 'home'),
        dest: place('KLIA2 第 2 航站楼', 'KLIA2', 'airport'),
        departAt: iso(now - 4 * 60 * MINUTE),
        status: 'closed',
        taken: 3,
        airport: true,
      },
      'MYR',
      7_600,
    ),
    settledAt: iso(now - 15 * MINUTE),
    role: 'member',
    myStatus: 'boarded',
    pendingRequests: 0,
    myShare: { minor: 2_470, currency: 'MYR' },
    myPaid: 'settled',
    myDueSince: null,
    eta: null,
  };
}

export function fixtureHistory(now: number): RideSummary[] {
  return [3, 5, 9].map((daysAgo, index) => ({
    ...ride(
      {
        id: `ride-history-${index + 1}`,
        start: place('Sunway Geo Residences', '双威', 'home'),
        dest: place(
          index === 1 ? 'KLIA2 第 2 航站楼' : 'Mid Valley Megamall',
          index === 1 ? 'KLIA2' : '谷中城',
        ),
        departAt: iso(now - daysAgo * DAY),
        status: 'closed',
        taken: 3,
      },
      'MYR',
      3_000,
    ),
    settledAt: iso(now - daysAgo * DAY + 2 * 60 * MINUTE),
  }));
}
