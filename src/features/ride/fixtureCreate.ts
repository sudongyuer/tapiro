import { emptyDraft, type RideDraft } from './create/draft';
import type { RecentRoute } from './create/recentRoutes';
import { customStart } from './create/timePicks';

const DAY_MS = 86_400_000;

export function fixtureRecentRoutes(
  seed: string | undefined,
  now: number = Date.now(),
): RecentRoute[] {
  if (seed !== 'two') return [];
  return [
    {
      start: {
        label: 'Sunway Pyramid 正门',
        latitude: 3.0733,
        longitude: 101.6078,
        short: 'Pyramid',
        shortEdited: true,
      },
      dest: {
        label: 'YC Residence 正门',
        latitude: 3.0645,
        longitude: 101.6182,
        short: 'YC',
        shortEdited: false,
      },
      seats: 4,
      at: new Date(now - 6 * DAY_MS).toISOString(),
    },
    {
      start: {
        label: 'Mid Valley Megamall North Court',
        latitude: 3.1185,
        longitude: 101.6776,
        short: '谷中城',
        shortEdited: false,
      },
      dest: {
        label: 'Sunway Geo Residences 大堂',
        latitude: 3.0657,
        longitude: 101.611,
        short: '双威',
        shortEdited: false,
      },
      seats: 3,
      at: new Date(now - 8 * DAY_MS).toISOString(),
    },
  ];
}

export const RIDE_DRAFT_SEEDS = ['airport', 'mall', 'worst'] as const;

const longText = (seed: string, count: number) =>
  [...seed.repeat(Math.ceil(count / [...seed].length))].slice(0, count).join('');

const place = (label: string, short: string, shortEdited = false) => ({
  label,
  latitude: 3.0657,
  longitude: 101.611,
  short,
  shortEdited,
});

export function fixtureRideDraft(
  seed: string | undefined,
  id: string,
  now: number = Date.now(),
): RideDraft | null {
  const kind = RIDE_DRAFT_SEEDS.find((candidate) => candidate === seed);
  if (!kind) return null;
  const base = emptyDraft(id, kind === 'worst' ? 'CNY' : 'MYR');
  const departAt = new Date(customStart(now) + DAY_MS / 2).toISOString();
  if (kind === 'airport') {
    return {
      ...base,
      tile: 'airport',
      start: place('Sunway Geo Residences 大堂', '双威'),
      dest: place('KLIA2 第 2 航站楼', 'KLIA2'),
      departAt,
      estimateText: '76',
      airportOpen: true,
      flightClock: '09:10',
      largeBags: 2,
    };
  }
  if (kind === 'mall') {
    return {
      ...base,
      start: place('Mid Valley Megamall North Court', '谷中城'),
      dest: place('Sunway Geo Residences 大堂', '双威'),
      departAt,
      seats: 3,
      estimateText: '24',
    };
  }
  const label = longText('Sunway Pyramid Convention Centre 旁边的 Sunway Lagoon 正门售票处，', 80);
  return {
    ...base,
    start: place(label, '谷中城北庭正门口', true),
    dest: place(label, '吉隆坡第二机场站', true),
    departAt,
    seats: 6,
    estimateText: '1600',
    airportOpen: true,
    flightClock: '23:55',
    largeBags: 9,
    noteOpen: true,
    note: longText(
      '正门进去左手边，玻璃门外的出租车候车点，穿红色外套的是我，带着两个大箱子。',
      140,
    ),
  };
}
