import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import {
  dismissAfterSeconds,
  liveActivityContent,
  liveActivityLink,
  type LiveActivitySubject,
} from './content';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;
const en = i18n.cloneInstance({ lng: 'en' }).t;

const at = (hour: number, minute: number) => new Date(2026, 10, 11, hour, minute).getTime();
const NOW = at(13, 8);

const onTheWay: LiveActivitySubject = {
  kind: 'bounty',
  id: 'b1',
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: at(13, 2),
  etaAt: at(13, 14),
};

const meetup = (home: boolean) => ({
  kind: 'ride' as const,
  id: 'r1',
  phase: 'meetup' as const,
  start: { name: 'Sunway Geo Residences', home },
  gatherAt: at(12, 51),
  departAt: at(13, 19),
  arrived: 2,
  total: 4,
});

describe('liveActivityContent', () => {
  test('a helper on the way shows the name, minutes, place and both times (274 A)', () => {
    const state = liveActivityContent(onTheWay, t, NOW);
    expect(state.title).toBe('小林 · 约 6 分钟到');
    expect(state.detail).toBe('图书馆 · 帮取快递');
    expect(state.minutes).toBe(6);
    expect(state.progress).toBeCloseTo(0.5);
    expect(state.startLabel).toBe('出发 13:02');
    expect(state.endLabel).toBe('约 13:14 到');
  });

  test('on-the-way content goes stale five minutes after the ETA (L4)', () => {
    expect(liveActivityContent(onTheWay, t, NOW).staleAfterSeconds).toBe(11 * 60);
  });

  test('the stale title drops the minutes so an old ETA never reads as live (L4)', () => {
    const state = liveActivityContent(onTheWay, t, NOW);
    expect(state.staleTitle).toBe('小林 · 在路上');
    expect(state.staleNote).toBe('可能不是最新');
    expect(liveActivityContent(meetup(false), t, NOW).staleTitle).toBe(
      '集合 · Sunway Geo Residences',
    );
  });

  test('a late helper still reads at least one minute, never zero', () => {
    const state = liveActivityContent(onTheWay, t, at(13, 20));
    expect(state.minutes).toBe(1);
    expect(state.progress).toBe(1);
    expect(state.staleAfterSeconds).toBe(0);
  });

  test('without a place the detail is the task alone', () => {
    expect(liveActivityContent({ ...onTheWay, place: null }, t, NOW).detail).toBe('帮取快递');
  });

  test('arrival is the final step: full line, no minutes, no stale date (277 A)', () => {
    const state = liveActivityContent(
      { ...onTheWay, phase: 'arrived', arrivedAt: at(13, 14) },
      t,
      at(13, 14),
    );
    expect(state.title).toBe('小林到了 · 图书馆');
    expect(state.minutes).toBeUndefined();
    expect(state.progress).toBe(1);
    expect(state.endLabel).toBe('13:14 到了');
    expect(state.staleAfterSeconds).toBeUndefined();
  });

  test('a ride starting at home never names the place on the Lock Screen (274 A)', () => {
    expect(liveActivityContent(meetup(true), t, NOW).title).toBe('集合 · 出发点');
    expect(liveActivityContent(meetup(false), t, NOW).title).toBe('集合 · Sunway Geo Residences');
  });

  test('a meet-up counts down to departure and goes stale at departure', () => {
    const state = liveActivityContent(meetup(false), t, NOW);
    expect(state.minutes).toBe(11);
    expect(state.detail).toBe('11 分钟后出发 · 2/4 到了');
    expect(state.endLabel).toBe('13:19 出发');
    expect(state.staleAfterSeconds).toBe(11 * 60);
  });

  test('departure keeps the home rule and shows who boarded', () => {
    const state = liveActivityContent(
      { ...meetup(true), phase: 'departed' as const, departedAt: at(13, 20), aboard: 3 },
      t,
      at(13, 20),
    );
    expect(state.title).toBe('出发了 · 出发点');
    expect(state.detail).toBe('3 人上车');
    expect(state.minutes).toBeUndefined();
  });

  test('English pluralises riders and uses its own unit', () => {
    const state = liveActivityContent(
      { ...meetup(false), phase: 'departed' as const, departedAt: at(13, 20), aboard: 1 },
      en,
      at(13, 20),
    );
    expect(state.detail).toBe('1 rider on board');
    expect(state.unit).toBe('min');
  });
});

describe('end and link', () => {
  test('arrival and departure linger 15 minutes; a cancel leaves at once (277 A)', () => {
    expect(dismissAfterSeconds('arrived')).toBe(900);
    expect(dismissAfterSeconds('departed')).toBe(900);
    expect(dismissAfterSeconds('cancelled')).toBe(0);
  });

  test('a tap opens the bounty status page or the ride', () => {
    expect(liveActivityLink({ kind: 'bounty', id: 'b1' })).toBe('tapiro://bounty/status/b1');
    expect(liveActivityLink({ kind: 'ride', id: 'r1' })).toBe('tapiro://ride/r1');
  });
});
