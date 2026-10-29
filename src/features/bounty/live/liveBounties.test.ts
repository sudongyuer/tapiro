import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';
import type { BountyCardKind } from '@/lib/liveItems';

import { timeParts } from '../post/timeText';
import {
  createFixtureLiveService,
  fixtureLiveBountyId,
  LIVE_FIXTURE_ROWS,
  type LiveFixtureRow,
} from './fixtureLiveService';
import { liveBountyItem, type LiveCopy } from './liveBounties';
import type { LiveRow, SeenCard } from './types';

const NOW = new Date('2026-10-29T06:00:00.000Z');

function i18nFor(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n;
}

const zh = i18nFor('zh-Hans');

const clock = (minutes: number) =>
  new Intl.DateTimeFormat('zh-Hans', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(NOW.getTime() + minutes * 60_000));

async function rowsByName() {
  const service = createFixtureLiveService({
    rows: LIVE_FIXTURE_ROWS,
    failFirstLoad: false,
    now: () => NOW,
  });
  const rows = await service.list();
  return new Map(
    LIVE_FIXTURE_ROWS.map((name) => [
      name,
      rows.find((r) => r.bountyId === fixtureLiveBountyId(name))!,
    ]),
  );
}

function copy(seen: { bountyId: string; card: SeenCard }[] = [], language = 'zh-Hans'): LiveCopy {
  const i18n = language === 'zh-Hans' ? zh : i18nFor(language);
  return {
    t: i18n.t,
    language,
    now: NOW,
    markSeen: async (bountyId, card) => {
      seen.push({ bountyId, card });
    },
  };
}

type Expected = {
  kind: BountyCardKind;
  line: string;
  action: string | null;
  target: 'applicants' | 'status' | 'detail';
  oneTime: boolean;
};

const autoConfirmDate = () => {
  const parts = timeParts(new Date(NOW.getTime() + 47 * 3_600_000).toISOString(), 'zh-Hans', NOW);
  return `${parts.day ? zh.t(`bounty.post.confirm.${parts.day}`) : parts.date} ${parts.clock}`;
};

const NINE_A: Record<LiveFixtureRow, () => Expected> = {
  posterOpen: () => ({
    kind: 'waitingConfirm',
    line: '等人申请',
    action: null,
    target: 'applicants',
    oneTime: false,
  }),
  posterApplicants: () => ({
    kind: 'bountyAction',
    line: '3 人申请，去选',
    action: '去选人',
    target: 'applicants',
    oneTime: false,
  }),
  posterAssigned: () => ({
    kind: 'bountyInProgress',
    line: `阿杰接了 · ${clock(40)} 前出发`,
    action: null,
    target: 'status',
    oneTime: false,
  }),
  posterLate: () => ({
    kind: 'bountyInProgress',
    line: '阿杰还没出发',
    action: null,
    target: 'status',
    oneTime: false,
  }),
  posterEnRoute: () => ({
    kind: 'bountyInProgress',
    line: `阿杰在路上 · ${clock(15)} 到`,
    action: null,
    target: 'status',
    oneTime: false,
  }),
  posterDone: () => ({
    kind: 'bountyAction',
    line: '阿杰说做完了 · 去确认',
    action: '去确认',
    target: 'status',
    oneTime: false,
  }),
  posterDisputed: () => ({
    kind: 'waitingConfirm',
    line: '等阿杰处理',
    action: null,
    target: 'status',
    oneTime: false,
  }),
  posterExpiredFree: () => ({
    kind: 'waitingConfirm',
    line: '过期了 · 免费次数已退回',
    action: null,
    target: 'detail',
    oneTime: true,
  }),
  posterExpiredCoin: () => ({
    kind: 'waitingConfirm',
    line: '过期了 · 貘币已退回',
    action: null,
    target: 'detail',
    oneTime: true,
  }),
  helperAssigned: () => ({
    kind: 'bountyAction',
    line: `小林选了你 · ${clock(40)} 前出发`,
    action: '出发',
    target: 'status',
    oneTime: false,
  }),
  helperLate: () => ({
    kind: 'bountyAction',
    line: '该出发了',
    action: '出发',
    target: 'status',
    oneTime: false,
  }),
  helperEnRoute: () => ({
    kind: 'bountyInProgress',
    line: '你在路上 · 到了点完成',
    action: null,
    target: 'status',
    oneTime: false,
  }),
  helperDone: () => ({
    kind: 'waitingConfirm',
    line: `等小林确认 · ${autoConfirmDate()} 自动确认`,
    action: null,
    target: 'status',
    oneTime: false,
  }),
  helperDisputed: () => ({
    kind: 'bountyAction',
    line: '小林说有问题',
    action: '去处理',
    target: 'status',
    oneTime: false,
  }),
  applicantWaiting: () => ({
    kind: 'waitingConfirm',
    line: '等小林选',
    action: null,
    target: 'detail',
    oneTime: false,
  }),
  applicantNotSelected: () => ({
    kind: 'waitingConfirm',
    line: '这次没选上',
    action: null,
    target: 'detail',
    oneTime: true,
  }),
};

const PATHS = {
  applicants: (id: string) => `/bounty/applicants/${id}`,
  status: (id: string) => `/bounty/status/${id}`,
  detail: (id: string) => `/bounty/${id}`,
};

describe('9A card per live row', () => {
  for (const name of LIVE_FIXTURE_ROWS) {
    test(name, async () => {
      const row = (await rowsByName()).get(name)!;
      const expected = NINE_A[name]();
      const item = liveBountyItem(row, copy());
      expect(item).not.toBeNull();
      expect({
        kind: item!.kind,
        sub: item!.sub,
        title: item!.title,
        line: item!.bounty.line,
        action: item!.bounty.actionLabel ?? null,
        target: item!.bounty.target,
        oneTime: item!.bounty.oneTime !== undefined,
        detailKind: item!.bounty.kind,
      }).toEqual({
        kind: expected.kind,
        sub: expected.line,
        title: '帮取快递',
        line: expected.line,
        action: expected.action,
        target: PATHS[expected.target](row.bountyId),
        oneTime: expected.oneTime,
        detailKind: expected.kind,
      });
    });
  }
});

describe('fallbacks and hidden rows', () => {
  const base = async (name: LiveFixtureRow) => (await rowsByName()).get(name)!;

  test('an assigned bounty without a start time drops the time, not the card', async () => {
    const poster = liveBountyItem({ ...(await base('posterAssigned')), startsAt: null }, copy());
    const helper = liveBountyItem({ ...(await base('helperAssigned')), startsAt: null }, copy());
    expect(poster?.sub).toBe('阿杰接了');
    expect(helper?.sub).toBe('小林选了你');
  });

  test('an unknown counterpart reads as 对方', async () => {
    const item = liveBountyItem({ ...(await base('posterLate')), counterpartName: null }, copy());
    expect(item?.sub).toBe('对方还没出发');
    expect(item?.bounty.counterpart).toBeNull();
  });

  test('settled, cancelled and closed bounties without a card show nothing', async () => {
    const helper = await base('helperDone');
    const poster = await base('posterDisputed');
    const applicant = await base('applicantWaiting');
    for (const row of [
      { ...helper, status: 'settled' },
      { ...poster, status: 'cancelled' },
      { ...poster, status: 'closed' },
      { ...applicant, status: 'cancelled' },
    ] satisfies LiveRow[]) {
      expect(liveBountyItem(row, copy())).toBeNull();
    }
  });

  test('a bountyAction row without an action is not given a pill', async () => {
    const item = liveBountyItem({ ...(await base('posterDone')), action: null }, copy());
    expect(item?.kind).toBe('bountyInProgress');
    expect(item?.bounty.actionLabel).toBeUndefined();
  });

  test('copy follows the language', async () => {
    const item = liveBountyItem(await base('posterApplicants'), copy([], 'en'));
    expect(item?.bounty.actionLabel).toBe(i18nFor('en').t('bounty.live.action.choose'));
    expect(item?.bounty.actionLabel).not.toBe('去选人');
  });
});

describe('one-time cards', () => {
  test('only one-time cards carry markSeen, and it marks the row card', async () => {
    const rows = await rowsByName();
    const seen: { bountyId: string; card: SeenCard }[] = [];
    const items = LIVE_FIXTURE_ROWS.map((name) => liveBountyItem(rows.get(name)!, copy(seen))!);
    expect(items.flatMap((item) => item.bounty.oneTime ?? [])).toEqual([
      'expired',
      'expired',
      'not_selected',
    ]);
    for (const item of items) await item.bounty.markSeen?.();
    expect(seen).toEqual([
      { bountyId: fixtureLiveBountyId('posterExpiredFree'), card: 'expired' },
      { bountyId: fixtureLiveBountyId('posterExpiredCoin'), card: 'expired' },
      { bountyId: fixtureLiveBountyId('applicantNotSelected'), card: 'not_selected' },
    ]);
  });
});
