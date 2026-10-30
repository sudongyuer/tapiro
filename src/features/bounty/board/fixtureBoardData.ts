import type { Point } from '@/lib/location/types';
import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';
import type { Money, MoneyReference } from '@/lib/money';
import { BOUNTY_CATEGORIES, type BountyCategory } from '@/lib/stickers/category';

import type { Person, Tier } from './types';

export const BOARDS = ['full', 'one', 'empty', 'worst', 'long', 'cny', 'crowded'] as const;
export type BoardFixture = (typeof BOARDS)[number];

export type FixtureBounty = {
  id: string;
  title: string;
  category: BountyCategory;
  reward: Money;
  reference: MoneyReference | null;
  placeLabel: string | null;
  point: Point | null;
  description: string | null;
  createdMinutesAgo: number;
  deadlineInMinutes: number | null;
  window: { startInMinutes: number; minutes: number } | null;
  applied: boolean;
  poster: Person;
};

export const BUSY_WINDOW = { startInMinutes: 60, minutes: 90 };

const EARTH_RADIUS_M = 6_371_008.8;

export function pointAt(origin: Point, meters: number, bearingDegrees: number): Point {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const deg = (radians: number) => (radians * 180) / Math.PI;
  const angular = meters / EARTH_RADIUS_M;
  const bearing = rad(bearingDegrees);
  const lat1 = rad(origin.latitude);
  const lon1 = rad(origin.longitude);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { latitude: deg(lat2), longitude: deg(lon2) };
}

const GRID_DEGREES = 0.001;

export function snapPoint(point: Point): Point {
  const snap = (value: number) =>
    Number((Math.round(value / GRID_DEGREES) * GRID_DEGREES).toFixed(3));
  return { latitude: snap(point.latitude), longitude: snap(point.longitude) };
}

const person = (id: string, name: string, tier: Tier): Person => ({ id, name, tier });

const KOBAYASHI = person('fixture-poster-lin', '小林', 'reliable');
const AISYAH = person('fixture-poster-aisyah', 'Aisyah', 'new_friend');
const JIE = person('fixture-poster-jie', '阿杰', 'very_reliable');
const WEI_JIE = person('fixture-poster-weijie', 'Wei Jie', 'reliable');
const MEI_LING = person('fixture-poster-meiling', 'Mei Ling', 'tapir_friend');
const HAFIZ = person('fixture-poster-hafiz', 'Hafiz', 'reliable');
const LILY = person('fixture-poster-lily', 'Lily', 'new_friend');
const ARIF = person('fixture-poster-arif', 'Arif', 'very_reliable');
const DANIEL = person('fixture-poster-daniel', 'Daniel', 'new_friend');
const JASON = person('fixture-poster-jason', 'Jason', 'reliable');
const SITI = person('fixture-poster-siti', 'Siti', 'new_friend');
const XIAOYU = person('fixture-poster-xiaoyu', '小雨', 'very_reliable');

type Spec = Omit<
  FixtureBounty,
  'point' | 'reference' | 'description' | 'window' | 'deadlineInMinutes' | 'applied'
> & {
  reference?: MoneyReference;
  meters?: number;
  bearing?: number;
  at?: Point;
  description?: string;
  window?: FixtureBounty['window'];
  deadlineInMinutes?: number;
  applied?: boolean;
};

function bounty(spec: Spec): FixtureBounty {
  const { meters, bearing = 0, at, ...rest } = spec;
  return {
    reference: null,
    description: null,
    window: null,
    deadlineInMinutes: null,
    applied: false,
    ...rest,
    point: at ?? (meters === undefined ? null : pointAt(SUNWAY_PYRAMID, meters, bearing)),
  };
}

const FULL: FixtureBounty[] = [
  bounty({
    id: 'fixture-bounty-01',
    title: '帮取快递',
    category: 'pickup',
    reward: { minor: 800, currency: 'MYR' },
    placeLabel: 'Sunway Geo 宿舍',
    meters: 300,
    bearing: 160,
    description: '快递在 Sunway Geo 楼下的驿站，取件码发你，放 A 座大堂就好。',
    deadlineInMinutes: 60,
    createdMinutesAgo: 10,
    poster: KOBAYASHI,
  }),
  bounty({
    id: 'fixture-bounty-02',
    title: '帮我买杯奶茶',
    category: 'buy',
    reward: { minor: 500, currency: 'MYR' },
    placeLabel: 'Sunway Pyramid LG',
    meters: 500,
    bearing: 40,
    window: { startInMinutes: 120, minutes: 60 },
    createdMinutesAgo: 25,
    poster: AISYAH,
  }),
  bounty({
    id: 'fixture-bounty-03',
    title: '陪我去银行开户',
    category: 'accompany',
    reward: { minor: 1500, currency: 'MYR' },
    placeLabel: 'Maybank Bandar Sunway',
    meters: 800,
    bearing: 250,
    window: { startInMinutes: 1440, minutes: 120 },
    createdMinutesAgo: 40,
    applied: true,
    poster: JIE,
  }),
  bounty({
    id: 'fixture-bounty-04',
    title: '帮忙打印论文',
    category: 'handle',
    reward: { minor: 600, currency: 'MYR' },
    placeLabel: 'Sunway University 图书馆',
    meters: 900,
    bearing: 300,
    deadlineInMinutes: 600,
    createdMinutesAgo: 55,
    poster: WEI_JIE,
  }),
  bounty({
    id: 'fixture-bounty-05',
    title: '教我微积分',
    category: 'study',
    reward: { minor: 3000, currency: 'MYR' },
    placeLabel: 'Sunway College',
    meters: 1200,
    bearing: 200,
    window: { startInMinutes: 60, minutes: 90 },
    createdMinutesAgo: 70,
    poster: MEI_LING,
  }),
  bounty({
    id: 'fixture-bounty-06',
    title: '搬两个箱子上楼',
    category: 'move',
    reward: { minor: 2000, currency: 'MYR' },
    placeLabel: 'Sunway Monash 宿舍',
    meters: 1600,
    bearing: 120,
    createdMinutesAgo: 90,
    poster: HAFIZ,
  }),
  bounty({
    id: 'fixture-bounty-07',
    title: '帮我取外卖',
    category: 'pickup',
    reward: { minor: 400, currency: 'MYR' },
    placeLabel: 'Sunway Geo Avenue',
    meters: 1900,
    bearing: 170,
    deadlineInMinutes: 150,
    createdMinutesAgo: 100,
    poster: LILY,
  }),
  bounty({
    id: 'fixture-bounty-08',
    title: '帮我去 JPJ 排号',
    category: 'queue',
    reward: { minor: 2500, currency: 'MYR' },
    placeLabel: 'JPJ Padang Jawa',
    meters: 3400,
    bearing: 280,
    createdMinutesAgo: 120,
    poster: ARIF,
  }),
  bounty({
    id: 'fixture-bounty-09',
    title: '帮我搬一个书架',
    category: 'move',
    reward: { minor: 1000, currency: 'MYR' },
    placeLabel: 'IKEA Damansara',
    meters: 5200,
    bearing: 330,
    createdMinutesAgo: 150,
    poster: DANIEL,
  }),
  bounty({
    id: 'fixture-bounty-10',
    title: '帮我抢演唱会门票',
    category: 'queue',
    reward: { minor: 5000, currency: 'MYR' },
    placeLabel: null,
    createdMinutesAgo: 5,
    poster: JASON,
  }),
  bounty({
    id: 'fixture-bounty-11',
    title: '借一个充电宝',
    category: 'other',
    reward: { minor: 300, currency: 'MYR' },
    placeLabel: null,
    createdMinutesAgo: 45,
    poster: SITI,
  }),
  bounty({
    id: 'fixture-bounty-12',
    title: '帮我拍几张毕业照',
    category: 'other',
    reward: { minor: 2000, currency: 'MYR' },
    placeLabel: null,
    window: { startInMinutes: 2880, minutes: 120 },
    createdMinutesAgo: 200,
    poster: XIAOYU,
  }),
];

const codePoints = (seed: string, count: number) =>
  [...seed.repeat(Math.ceil(count / [...seed].length))].slice(0, count).join('');

const LONG_NAME = codePoints('Nur Aisyah Humaira binti Mohd Khairuddin ', 40);
const LONG_PERSON = person('fixture-poster-long', LONG_NAME, 'tapir_friend');
const LONG_DESCRIPTION = codePoints('包裹有点重，麻烦小心拿，到了楼下给我发消息，我下来接。', 500);

export const WORST_CNY_REWARD: Money = { minor: 80000, currency: 'CNY' };
export const WORST_CNY_REFERENCE: MoneyReference = {
  minor: 48980,
  currency: 'MYR',
  rateDate: '2026-10-28',
};

const WORST: FixtureBounty[] = [
  bounty({
    id: 'fixture-worst-01',
    title: codePoints('帮我从 Sunway Pyramid 搬三个很重的行李箱到宿舍二十三楼，', 60),
    category: 'move',
    reward: { minor: 50000, currency: 'MYR' },
    placeLabel: codePoints('Sunway Geo Residences A 座大堂旁边的便利店门口，', 80),
    meters: 100,
    bearing: 90,
    description: LONG_DESCRIPTION,
    deadlineInMinutes: 30,
    createdMinutesAgo: 3,
    poster: LONG_PERSON,
  }),
  bounty({
    id: 'fixture-worst-02',
    title: codePoints('Tolong ambilkan bungkusan saya di pejabat pos Bandar Sunway ', 60),
    category: 'pickup',
    reward: { minor: 100, currency: 'MYR' },
    placeLabel: codePoints('Pejabat Pos Bandar Sunway, Jalan PJS 11/28, Subang Jaya ', 80),
    meters: 1800,
    bearing: 30,
    window: { startInMinutes: 240, minutes: 600 },
    createdMinutesAgo: 30,
    applied: true,
    poster: LONG_PERSON,
  }),
  bounty({
    id: 'fixture-worst-03',
    title: codePoints('帮我去 JPJ 排号续驾照，人很多可能要排三个小时，', 60),
    category: 'queue',
    reward: WORST_CNY_REWARD,
    reference: WORST_CNY_REFERENCE,
    placeLabel: codePoints('Jabatan Pengangkutan Jalan Padang Jawa, Shah Alam ', 80),
    meters: 18_400,
    bearing: 300,
    createdMinutesAgo: 60,
    poster: LONG_PERSON,
  }),
  bounty({
    id: 'fixture-worst-04',
    title: codePoints('没写地点也没写时间的悬赏，标题刚好六十个字，', 60),
    category: 'other',
    reward: { minor: 100, currency: 'MYR' },
    placeLabel: null,
    description: LONG_DESCRIPTION,
    createdMinutesAgo: 1,
    poster: LONG_PERSON,
  }),
];

const WORST_TITLES = [
  '帮我从 Mid Valley Megamall 带一份晚餐回 Sunway Geo，顺便买两瓶水和一包纸巾，',
  'Tolong temankan saya ke klinik di Bandar Sunway untuk pemeriksaan kesihatan ',
];
const WORST_PLACES = [
  'Mid Valley Megamall, Lingkaran Syed Putra, Mid Valley City, Kuala Lumpur ',
  'Klinik Kesihatan Bandar Sunway, Jalan PJS 9/1, Bandar Sunway, Subang Jaya ',
];
const WORST_COUNT = 45;
const WORST_FILLER = WORST_COUNT - 4;

const WORST_FILLERS: FixtureBounty[] = Array.from({ length: WORST_FILLER }, (_, index) => {
  const n = index + 5;
  const pick = index % 2;
  return bounty({
    id: `fixture-worst-${String(n).padStart(2, '0')}`,
    title: codePoints(WORST_TITLES[pick], 60),
    category: BOUNTY_CATEGORIES[index % BOUNTY_CATEGORIES.length],
    reward: { minor: pick === 0 ? 50000 : 100, currency: 'MYR' },
    placeLabel: codePoints(WORST_PLACES[pick], 80),
    meters: 2100 + 400 * index,
    bearing: (index * 53) % 360,
    createdMinutesAgo: 5 + index * 11,
    applied: index % 7 === 3,
    poster: LONG_PERSON,
  });
});

const LONG_POSTERS = [KOBAYASHI, AISYAH, JIE, WEI_JIE, MEI_LING, HAFIZ, LILY, ARIF];
const LONG_LOCATED = 40;
const LONG_COUNT = 45;

const LONG: FixtureBounty[] = Array.from({ length: LONG_COUNT }, (_, index) => {
  const n = index + 1;
  const located = index < LONG_LOCATED;
  return bounty({
    id: `fixture-long-${String(n).padStart(2, '0')}`,
    title: `长列表悬赏 ${n}`,
    category: BOUNTY_CATEGORIES[index % BOUNTY_CATEGORIES.length],
    reward: { minor: 100 * (5 + (index % 20)), currency: 'MYR' },
    placeLabel: located ? `Sunway 第 ${n} 栋` : null,
    ...(located ? { meters: 150 + 120 * index, bearing: (index * 37) % 360 } : {}),
    createdMinutesAgo: 3 + index * 7,
    poster: LONG_POSTERS[index % LONG_POSTERS.length],
  });
});

export const CNY_REWARD: Money = { minor: 5000, currency: 'CNY' };
export const CNY_REFERENCE: MoneyReference = {
  minor: 3247,
  currency: 'MYR',
  rateDate: '2026-10-28',
};

const CNY: FixtureBounty[] = [
  bounty({
    id: 'fixture-cny-01',
    title: '帮我带一盒月饼',
    category: 'buy',
    reward: CNY_REWARD,
    reference: CNY_REFERENCE,
    placeLabel: 'Sunway Pyramid LG',
    meters: 400,
    bearing: 60,
    description: '要双黄白莲蓉的，放 A 座大堂就好。',
    createdMinutesAgo: 8,
    poster: XIAOYU,
  }),
  bounty({
    id: 'fixture-cny-02',
    title: '帮我寄一份文件回国',
    category: 'handle',
    reward: { minor: 3000, currency: 'CNY' },
    placeLabel: 'Pos Malaysia Bandar Sunway',
    meters: 700,
    bearing: 200,
    createdMinutesAgo: 20,
    poster: JIE,
  }),
];

export const CROWDED_CELL: Point = { latitude: 3.074, longitude: 101.608 };
export const CROWDED_CORNER: Point = { latitude: 3.0725, longitude: 101.6105 };

const CROWDED_POSTERS = [
  KOBAYASHI,
  AISYAH,
  JIE,
  WEI_JIE,
  MEI_LING,
  HAFIZ,
  LILY,
  ARIF,
  SITI,
  XIAOYU,
];
const CROWDED_CELL_OFFSETS: [number, number][] = [
  [0.0003, -0.0003],
  [0.0003, 0.0003],
  [-0.0003, -0.0003],
  [-0.0003, 0.0003],
  [0, 0.0001],
  [0.0001, 0],
];
const CROWDED_CORNER_OFFSETS: [number, number][] = [
  [0.00005, 0.00005],
  [0.00005, -0.00005],
  [-0.00005, 0.00005],
  [-0.00005, -0.00005],
];

const crowded = (origin: Point, offsets: [number, number][], first: number) =>
  offsets.map(([north, east], index) => {
    const n = first + index;
    return bounty({
      id: `fixture-crowded-${String(n).padStart(2, '0')}`,
      title: `同一栋楼的悬赏 ${n}`,
      category: BOUNTY_CATEGORIES[(n - 1) % BOUNTY_CATEGORIES.length],
      reward: { minor: 100 * (4 + n), currency: 'MYR' },
      placeLabel: `Sunway Pyramid ${n} 号门`,
      at: { latitude: origin.latitude + north, longitude: origin.longitude + east },
      createdMinutesAgo: 4 + n * 6,
      poster: CROWDED_POSTERS[(n - 1) % CROWDED_POSTERS.length],
    });
  });

const CROWDED: FixtureBounty[] = [
  ...crowded(CROWDED_CELL, CROWDED_CELL_OFFSETS, 1),
  ...crowded(CROWDED_CORNER, CROWDED_CORNER_OFFSETS, 7),
];

export const FIXTURE_BOARDS: Record<BoardFixture, FixtureBounty[]> = {
  full: FULL,
  one: FULL.slice(3, 4),
  empty: [],
  worst: [...WORST, ...WORST_FILLERS],
  long: LONG,
  cny: [...CNY, ...FULL.slice(0, 2)],
  crowded: CROWDED,
};
