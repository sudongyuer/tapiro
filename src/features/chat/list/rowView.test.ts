import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import type { ChatMember, ThreadSummary } from '../types';
import { rowTime, rowView, threadTitle } from './rowView';

const i18n = createInstance();
i18n.init({ resources, lng: 'zh-Hans', initAsync: false, interpolation: { escapeValue: false } });
const t = i18n.t;

const ME = 'me';
const NOW = new Date(2026, 10, 6, 15, 30).getTime();
const at = (day: number, hour = 9, minute = 5) =>
  new Date(2026, 10, day, hour, minute).toISOString();

const member = (id: string, name: string | null, left = false): ChatMember => ({
  id,
  name,
  avatarUrl: null,
  left,
  blockedByMe: false,
  organiser: false,
});

const bountyRow = (over: Partial<ThreadSummary> = {}): ThreadSummary => ({
  id: 't1',
  kind: 'bounty',
  itemId: 'b1',
  item: { kind: 'bounty', title: '帮取快递', category: 'pickup', art: null, status: 'assigned' },
  createdAt: at(6, 8),
  left: false,
  unread: false,
  lastReadAt: null,
  peerReadAt: null,
  members: [member('jie', '阿杰')],
  lastMessage: null,
  ...over,
});

const message = (senderId: string, body: string, createdAt = at(6, 12, 2)) => ({
  id: 'm1',
  threadId: 't1',
  senderId,
  clientId: 'c1',
  body,
  createdAt,
});

const rideRow = (over: Partial<ThreadSummary> = {}): ThreadSummary =>
  bountyRow({
    kind: 'ride',
    item: { kind: 'ride', from: '双威', to: 'KLIA2', departsAt: at(7), status: 'open' },
    members: [member('mei', '美玲'), member('arif', 'Arif'), member('gone', 'Gone', true)],
    ...over,
  });

describe('a 消息 row', () => {
  test('a bounty row shows its title, the other side, their last line and the time', () => {
    const view = rowView(
      bountyRow({ lastMessage: message('jie', '我到楼下了'), unread: true }),
      ME,
      NOW,
      t,
      'zh-Hans',
    );
    expect(view).toMatchObject({
      art: { kind: 'bounty', source: { art: null, category: 'pickup', title: '帮取快递' } },
      title: '帮取快递',
      side: '阿杰',
      last: '我到楼下了',
      time: '12:02',
      unread: true,
    });
    expect(view.a11y).toBe('帮取快递，阿杰，我到楼下了，12:02，未读');
  });

  test('a ride row shows the route, how many are in it, and who said the last line', () => {
    const view = rowView(
      rideRow({ lastMessage: message('mei', '我晚 5 分钟') }),
      ME,
      NOW,
      t,
      'zh-Hans',
    );
    expect(view).toMatchObject({
      art: { kind: 'ride', id: 'car' },
      title: '双威 → KLIA2',
      side: '3 人',
      last: '美玲：我晚 5 分钟',
      unread: false,
    });
    expect(view.a11y.endsWith('未读')).toBe(false);
  });

  test('in a ride group the last line of someone you blocked stays folded', () => {
    const view = rowView(
      rideRow({
        members: [{ ...member('mei', '美玲'), blockedByMe: true }, member('arif', 'Arif')],
        lastMessage: message('mei', '先转 RM20 给我'),
      }),
      ME,
      NOW,
      t,
      'zh-Hans',
    );
    expect(view.last).toBe(t('chat.thread.folded'));
  });

  test('your own last line is marked as yours, and line breaks fold into one line', () => {
    const view = rowView(
      bountyRow({ lastMessage: message(ME, '放门口\n\n谢谢') }),
      ME,
      NOW,
      t,
      'zh-Hans',
    );
    expect(view.last).toBe('我：放门口 谢谢');
  });

  test('a new thread says it has no messages and is dated by its creation', () => {
    const view = rowView(bountyRow(), ME, NOW, t, 'zh-Hans');
    expect(view.last).toBe(t('chat.list.noMessage'));
    expect(view.time).toBe('08:05');
  });

  test('a missing name falls back, and a thread you left says so', () => {
    expect(rowView(bountyRow({ members: [member('x', null)] }), ME, NOW, t, 'zh-Hans').side).toBe(
      t('chat.list.someone'),
    );
    expect(rowView(bountyRow({ members: [] }), ME, NOW, t, 'zh-Hans').side).toBe(
      t('chat.list.someone'),
    );
    expect(rowView(rideRow({ left: true }), ME, NOW, t, 'zh-Hans').side).toBe(t('chat.list.left'));
  });
});

describe('the row time', () => {
  test('today is a clock, yesterday a word, this week a weekday, older a date', () => {
    expect(rowTime(at(6, 7, 9), NOW, t, 'en')).toBe('07:09');
    expect(rowTime(at(5, 23, 59), NOW, t, 'en')).toBe(t('chat.list.yesterday'));
    expect(rowTime(at(2), NOW, t, 'en')).toBe('Mon');
    expect(rowTime(at(1), NOW, t, 'en')).toBe('Sun');
    expect(rowTime(new Date(2026, 9, 30, 9).toISOString(), NOW, t, 'en')).toBe('Oct 30');
    expect(rowTime(new Date(2025, 11, 31, 9).toISOString(), NOW, t, 'en')).toBe('Dec 31, 2025');
  });
});

describe('the thread title', () => {
  test('a bounty thread is titled by the other side, a ride group by its route', () => {
    expect(threadTitle(bountyRow(), t)).toBe('阿杰');
    expect(threadTitle(bountyRow({ members: [member('x', null)] }), t)).toBe(
      t('chat.list.someone'),
    );
    expect(threadTitle(rideRow(), t)).toBe('双威 → KLIA2');
  });
});
