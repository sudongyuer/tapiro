import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import type { ChatMessage, ThreadInfo, ThreadItem } from '../types';
import { bubbleRows, canRetry, itemCardView } from './threadView';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

const NOW = new Date(2026, 10, 6, 15, 30).getTime();
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString();

const info = (over: Partial<ThreadInfo> = {}): ThreadInfo => ({
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  item: { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null, status: 'en_route' },
  createdAt: at(6, 8),
  left: false,
  unread: false,
  lastReadAt: null,
  peerReadAt: null,
  members: [
    { id: 'jie', name: '阿杰', avatarUrl: null, left: false, blockedByMe: false, organiser: false },
  ],
  ...over,
});

const stored = (n: number, senderId: string, createdAt: string): ThreadItem => {
  const message: ChatMessage = {
    id: `m${n}`,
    threadId: 't1',
    senderId,
    clientId: `c${n}`,
    body: `body ${n}`,
    createdAt,
  };
  return {
    kind: 'stored',
    key: senderId === 'me' ? message.clientId : message.id,
    message,
    mine: senderId === 'me',
  };
};

describe('item card', () => {
  test('a bounty shows its title and the status the user is shown', () => {
    const view = itemCardView(info().item, NOW, t, 'zh-Hans');
    expect([view.title, view.status, view.a11y]).toEqual([
      '帮取快递',
      '在路上',
      '帮取快递，在路上，看详情',
    ]);
  });

  test('a ride shows its route, when it leaves and its phase', () => {
    const ride = itemCardView(
      { kind: 'ride', from: '双威', to: 'KLIA2', departsAt: at(7, 9, 30), status: 'gathering' },
      NOW,
      t,
      'zh-Hans',
    );
    expect([ride.title, ride.status]).toEqual(['双威 → KLIA2', '明天 09:30 出发 · 集合中']);
    expect(ride.art).toEqual({ kind: 'ride', id: 'car' });
  });
});

describe('bubble rows', () => {
  test('已读 sits under your newest stored message only, with the time the other side read it', () => {
    const items = [
      stored(1, 'jie', at(6, 14)),
      stored(2, 'me', at(6, 14, 5)),
      stored(3, 'me', at(6, 14, 6)),
    ];
    const rows = bubbleRows(items, info({ peerReadAt: at(6, 14, 8) }), 'm3', NOW, t, 'zh-Hans');
    expect(rows.map((row) => row.read)).toEqual([null, null, '已读 14:08']);
  });

  test('a time line opens the thread and every gap of an hour or more', () => {
    const items = [
      stored(1, 'jie', at(5, 20)),
      stored(2, 'me', at(5, 20, 30)),
      stored(3, 'jie', at(6, 9)),
    ];
    expect(bubbleRows(items, info(), null, NOW, t, 'zh-Hans').map((row) => row.timeBreak)).toEqual([
      '昨天 20:00',
      null,
      '09:00',
    ]);
  });

  test('a ride group names the speaker when the speaker changes; a bounty thread never does', () => {
    const group = info({
      kind: 'ride',
      item: { kind: 'ride', from: '双威', to: 'KLIA2', departsAt: at(7, 9), status: 'open' },
      members: [
        {
          id: 'mei',
          name: '美玲',
          avatarUrl: null,
          left: false,
          blockedByMe: false,
          organiser: false,
        },
        {
          id: 'arif',
          name: 'Arif',
          avatarUrl: null,
          left: false,
          blockedByMe: false,
          organiser: false,
        },
      ],
    });
    const items = [
      stored(1, 'mei', at(6, 14)),
      stored(2, 'mei', at(6, 14, 1)),
      stored(3, 'arif', at(6, 14, 2)),
      stored(4, 'me', at(6, 14, 3)),
      stored(5, 'arif', at(6, 14, 4)),
    ];
    expect(bubbleRows(items, group, null, NOW, t, 'zh-Hans').map((row) => row.name)).toEqual([
      '美玲',
      null,
      'Arif',
      null,
      'Arif',
    ]);
    expect(
      bubbleRows(items, info(), null, NOW, t, 'zh-Hans').every((row) => row.name === null),
    ).toBe(true);
  });

  test('a waiting message is mine and keeps its body', () => {
    const pending: ThreadItem = {
      kind: 'pending',
      key: 'p1',
      pending: {
        clientId: 'p1',
        threadId: 't1',
        body: '在大堂等你',
        writtenAt: at(6, 15),
        state: 'failed',
        failure: 'failed',
      },
    };
    const [row] = bubbleRows([pending], info(), null, NOW, t, 'zh-Hans');
    expect([row.mine, row.body, row.read]).toEqual([true, '在大堂等你', null]);
  });
});

describe('retry', () => {
  test('only a message whose outcome is unknown can be sent again; a refused one can only be deleted', () => {
    expect(canRetry('failed')).toBe(true);
    for (const failure of [
      'blocked',
      'notMember',
      'notFound',
      'invalid',
      'clientIdReused',
    ] as const) {
      expect(canRetry(failure)).toBe(false);
    }
  });
});

describe('blocked people in a thread', () => {
  const person = (id: string, name: string, blockedByMe = false) => ({
    id,
    name,
    avatarUrl: null,
    left: false,
    blockedByMe,
    organiser: false,
  });
  const group = info({
    kind: 'ride',
    item: { kind: 'ride', from: '双威', to: 'KLIA2', departsAt: at(7, 9), status: 'open' },
    members: [person('mei', '美玲', true), person('arif', 'Arif')],
  });
  const items = [stored(1, 'mei', at(6, 14)), stored(2, 'arif', at(6, 14, 1))];

  test('a ride group folds the messages of someone you blocked, without their name', () => {
    const rows = bubbleRows(items, group, null, NOW, t, 'zh-Hans');
    expect(rows.map((row) => [row.folded, row.name])).toEqual([
      [true, null],
      [false, 'Arif'],
    ]);
  });

  test('a folded message opens once it is revealed', () => {
    const rows = bubbleRows(items, group, null, NOW, t, 'zh-Hans', new Set([items[0].key]));
    expect(rows.map((row) => row.folded)).toEqual([false, false]);
    expect(rows[0].name).toBe('美玲');
  });

  test('a bounty thread keeps the history of a peer you blocked unfolded', () => {
    const blocked = info({ members: [person('jie', '阿杰', true)] });
    const rows = bubbleRows([stored(1, 'jie', at(6, 14))], blocked, null, NOW, t, 'zh-Hans');
    expect(rows[0].folded).toBe(false);
  });

  test('a thread you left still lets you report what was said', () => {
    const rows = bubbleRows(
      [stored(1, 'jie', at(6, 14))],
      info({ left: true }),
      null,
      NOW,
      t,
      'zh-Hans',
    );
    expect(rows[0].reportable).toBe(true);
  });
});
