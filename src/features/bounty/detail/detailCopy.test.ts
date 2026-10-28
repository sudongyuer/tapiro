import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { detailCopy, urgentLine } from './detailCopy';
import type { DetailView } from './detailState';

const NOW = new Date(2026, 9, 27, 15, 0);
const at = (hour: number, minute = 0) => new Date(2026, 9, 27, hour, minute).toISOString();

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
}

const t = translator('zh-Hans');

const VIEW: DetailView = {
  id: 'b1',
  title: '帮取快递',
  category: 'pickup',
  rewardSen: 800,
  placeLabel: 'Sunway Geo 宿舍',
  distanceM: 300,
  startsAt: null,
  endsAt: null,
  deadlineAt: at(17),
  poster: { id: 'p1', name: '小林', tier: 'reliable' },
  description: undefined,
  action: 'apply',
  note: null,
};

describe('detailCopy', () => {
  test('reads the place hint with the card distance, the deadline and 急 with the time left', () => {
    const copy = detailCopy(VIEW, t, 'zh-Hans', NOW);
    expect(copy.placeHint).toBe('约 300 m · 精确地址只给选中的人');
    expect(copy.time).toBe('今天 17:00 前');
    expect(copy.urgent).toBe('急 · 还有 2 小时');
    expect(copy.name).toBe('小林');
    expect(copy.tier).toBe('靠谱');
    expect(copy.reward).toMatch(/^RM\s8$/);
  });

  test('shows the place alone without a distance, and no 急 for a far deadline', () => {
    const copy = detailCopy({ ...VIEW, distanceM: null, deadlineAt: at(20) }, t, 'zh-Hans', NOW);
    expect(copy.placeHint).toBeNull();
    expect(copy.urgent).toBeNull();
  });

  test('uses the kilometre format from 1 km and falls back to the unknown name', () => {
    const copy = detailCopy(
      { ...VIEW, distanceM: 1600, poster: { id: 'p2', name: null, tier: 'new_friend' } },
      t,
      'zh-Hans',
      NOW,
    );
    expect(copy.placeHint).toBe('约 1.6 km · 精确地址只给选中的人');
    expect(copy.name).toBe(t('bounty.post.unknownName'));
  });
});

describe('urgentLine', () => {
  test('counts whole hours down and minutes up, and only within 3 hours', () => {
    expect(urgentLine(at(15, 59), t, NOW)).toBe('急 · 还有 59 分钟');
    expect(urgentLine(at(16), t, NOW)).toBe('急 · 还有 1 小时');
    expect(urgentLine(at(18), t, NOW)).toBe('急 · 还有 3 小时');
    expect(urgentLine(at(18, 1), t, NOW)).toBeNull();
    expect(urgentLine(at(14), t, NOW)).toBeNull();
    expect(urgentLine(null, t, NOW)).toBeNull();
  });

  test('the en copy picks singular and plural', () => {
    const en = translator('en');
    expect(urgentLine(at(16), en, NOW)).toBe('Urgent · 1 hour left');
    expect(urgentLine(at(15, 2), en, NOW)).toBe('Urgent · 2 minutes left');
  });
});
