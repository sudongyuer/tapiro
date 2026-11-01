import type { PostDraft } from './types';

export const FIXTURE_USER_ID = '00000000-0000-4000-8000-000000000001';
export const FIXTURE_DRAFTS = ['none', 'demo', 'one', 'worst', 'worstCny'] as const;
export type FixtureDraftName = (typeof FIXTURE_DRAFTS)[number];

const HOUR_MS = 3_600_000;
const STEP_MS = 5 * 60_000;
const WEDNESDAY = 3;

const WORST_TITLE = '帮忙从 Mid Valley Megamall 取 Uniqlo 外套再买两杯 Tealive 🧋送到 Sunway 楼';

const WORST_DESCRIPTION = (() => {
  const sentence =
    'Shopee 和 Lazada 的包裹都在 Sunway Geo Residence 管理处，取件码发你私信；顺路的话再帮我在楼下 Family Mart 买两瓶 100Plus 和一包 Milo。';
  const points = [...sentence.repeat(10)];
  return points.slice(0, 500).join('');
})();

function nextStep(time: number) {
  return Math.ceil(time / STEP_MS) * STEP_MS;
}

function todayAt(now: Date, hours: number, minutes: number) {
  const at = new Date(now);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

function demoDeadline(now: Date) {
  const sixPm = todayAt(now, 18, 0);
  return sixPm.getTime() > now.getTime() ? sixPm : new Date(nextStep(now.getTime() + 2 * HOUR_MS));
}

function worstWindow(now: Date) {
  const start = todayAt(now, 23, 55);
  do start.setDate(start.getDate() + 1);
  while (start.getDay() !== WEDNESDAY);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function fixtureDraft(name: string | undefined, id: string, now: Date): PostDraft | null {
  if (name === 'demo') {
    return {
      id,
      title: '帮我取个快递',
      category: 'pickup',
      categorySource: 'chosen',
      art: null,
      rewardText: '8',
      currency: 'MYR',
      description: 'Shopee 包裹在 Sunway Geo 管理处，取件码 8812，放我门口就行。',
      time: { kind: 'deadline', deadlineAt: demoDeadline(now).toISOString() },
      place: null,
      updatedAt: now.toISOString(),
    };
  }
  if (name === 'one') {
    return {
      id,
      title: '借伞',
      category: 'other',
      categorySource: 'chosen',
      art: null,
      rewardText: '1',
      currency: 'MYR',
      description: null,
      time: { kind: 'none' },
      place: null,
      updatedAt: now.toISOString(),
    };
  }
  if (name === 'worst' || name === 'worstCny') {
    const cny = name === 'worstCny';
    return {
      id,
      title: WORST_TITLE,
      category: 'other',
      categorySource: 'chosen',
      art: null,
      rewardText: cny ? '800' : '500',
      currency: cny ? 'CNY' : 'MYR',
      description: WORST_DESCRIPTION,
      time: { kind: 'window', ...worstWindow(now) },
      place: null,
      updatedAt: now.toISOString(),
    };
  }
  return null;
}
