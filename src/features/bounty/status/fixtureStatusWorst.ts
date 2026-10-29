import type { Person } from '../board/types';

export const STATUS_DATA = ['demo', 'worst', 'unnamed'] as const;
export type StatusData = (typeof STATUS_DATA)[number];

const codePoints = (seed: string, count: number) =>
  [...seed.repeat(Math.ceil(count / [...seed].length))].slice(0, count).join('').trimEnd();

export const WORST_POSTER: Person = {
  id: 'fixture-poster-lin',
  name: 'Wan Nurul Aisyah binti Wan Abdul Rahman',
  tier: 'reliable',
};
export const WORST_HELPER: Person = {
  id: 'fixture-applicant-jie',
  name: 'Muhammad Hafiz Haikal bin Mohd Yusof Ali',
  tier: 'very_reliable',
};
export const WORST_TITLE = codePoints(
  '帮我从 Sunway Pyramid 搬三个很重的行李箱到宿舍二十三楼，',
  60,
);
export const WORST_REASON = codePoints(
  'Kotak bungkusan remuk dan dua cawan di dalamnya pecah. 快递盒子压坏了，里面的两个杯子碎了，另外少了一包纸巾，麻烦你回去问一下店家。',
  140,
);
export const WORST_REWARD_SEN = 50000;
export const WORST_PLACE = codePoints('Sunway Geo Residences A 座大堂旁边的便利店门口，', 80);
export const WORST_ADDRESS = codePoints(
  'Sunway Geo Residences, Block B, Level 23, Unit 23-07, Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya, Selangor ',
  120,
);

const DAY_MS = 86_400_000;

export function nextMorning(now: number, days = 1) {
  const at = new Date(now + days * DAY_MS);
  at.setHours(9, 30, 0, 0);
  return at.getTime();
}

const WORST_LATE_MS = 2 * DAY_MS;

type Timed = {
  startsAt: string | null;
  etaAt: string | null;
  events: { kind: string; at: string }[];
};

const iso = (ms: number) => new Date(ms).toISOString();

export function worstTimes<T extends Timed>(item: T, scenario: string, now: number): T {
  if (scenario === 'assigned') return { ...item, startsAt: iso(nextMorning(now, 3)) };
  if (scenario === 'assignedLate') {
    const late = now - WORST_LATE_MS;
    const events = item.events.map((entry) =>
      entry.kind === 'start_reminder' ? { ...entry, at: iso(late) } : entry,
    );
    return { ...item, startsAt: iso(late), events };
  }
  if (scenario === 'enRoute' || scenario === 'enRouteChanged') {
    return { ...item, etaAt: iso(nextMorning(now)) };
  }
  return item;
}
