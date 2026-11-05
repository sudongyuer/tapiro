import type { TFunction } from 'i18next';

import { addDays, localClock, localDayKey } from '@/lib/deviceClock';

import { rowTime } from '../list/rowView';
import type { RowArt } from '../list/rowView';
import type { ChatSubject, SendFailure, ThreadInfo, ThreadItem } from '../types';

export type ItemCardView = { art: RowArt; title: string; status: string; a11y: string };

const RIDE_STATUS_KEYS = {
  open: 'chat.item.ride.open',
  gathering: 'chat.item.ride.gathering',
  departed: 'chat.item.ride.departed',
  arrived: 'chat.item.ride.arrived',
  settling: 'chat.item.ride.settling',
  closed: 'chat.item.ride.closed',
  cancelled: 'chat.item.ride.cancelled',
  expired: 'chat.item.ride.expired',
} as const;

const BOUNTY_STATUS_KEYS = {
  open: 'chat.item.bounty.open',
  assigned: 'chat.item.bounty.assigned',
  en_route: 'chat.item.bounty.en_route',
  done: 'chat.item.bounty.done',
  disputed: 'chat.item.bounty.disputed',
  confirmed: 'chat.item.bounty.confirmed',
  settled: 'chat.item.bounty.settled',
  closed: 'chat.item.bounty.closed',
  cancelled: 'chat.item.bounty.cancelled',
} as const;

export function departLabel(at: string, now: number, t: TFunction, language: string) {
  const time = Date.parse(at);
  const day = localDayKey(time);
  const today = localDayKey(now);
  const clock = localClock(time);
  if (day === today) return t('chat.item.today', { clock });
  if (day === addDays(today, 1)) return t('chat.item.tomorrow', { clock });
  const date = new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(
    new Date(time),
  );
  return t('chat.item.onDay', { date, clock });
}

export function itemCardView(
  item: ChatSubject,
  now: number,
  t: TFunction,
  language: string,
): ItemCardView {
  if (item.kind === 'bounty') {
    const status = t(BOUNTY_STATUS_KEYS[item.status]);
    return {
      art: {
        kind: 'bounty',
        source: { art: item.art, category: item.category, title: item.title },
      },
      title: item.title,
      status,
      a11y: t('chat.item.a11y', { title: item.title, status }),
    };
  }
  const title = t('chat.list.route', { from: item.from, to: item.to });
  const status = t('chat.item.rideStatus', {
    when: departLabel(item.departsAt, now, t, language),
    status: t(RIDE_STATUS_KEYS[item.status]),
  });
  return {
    art: { kind: 'ride', id: 'car' },
    title,
    status,
    a11y: t('chat.item.a11y', { title, status }),
  };
}

export function readLabel(peerReadAt: string, now: number, t: TFunction, language: string) {
  return t('chat.thread.read', { time: rowTime(peerReadAt, now, t, language) });
}

const RETRYABLE: ReadonlySet<SendFailure> = new Set(['failed']);

export const canRetry = (failure: SendFailure | null) => failure === null || RETRYABLE.has(failure);

export function senderName(info: ThreadInfo | null, senderId: string, t: TFunction) {
  return info?.members.find((member) => member.id === senderId)?.name ?? t('chat.list.someone');
}

export type BubbleRow = {
  key: string;
  item: ThreadItem;
  mine: boolean;
  body: string;
  name: string | null;
  speaker: string | null;
  reportable: boolean;
  folded: boolean;
  timeBreak: string | null;
  read: string | null;
};

const BREAK_MS = 60 * 60_000;

const itemTime = (item: ThreadItem) =>
  item.kind === 'pending' ? item.pending.writtenAt : item.message.createdAt;

export function breakLabel(at: string, now: number, t: TFunction, language: string) {
  const time = Date.parse(at);
  const clock = localClock(time);
  if (localDayKey(time) === localDayKey(now)) return clock;
  return t('chat.item.onDay', { date: rowTime(at, now, t, language), clock });
}

export function bubbleRows(
  oldestFirst: readonly ThreadItem[],
  info: ThreadInfo | null,
  seenMessageId: string | null,
  now: number,
  t: TFunction,
  language: string,
  revealed: ReadonlySet<string> = new Set(),
): BubbleRow[] {
  const group = info?.kind === 'ride';
  const blocked = new Set(
    group
      ? (info?.members ?? []).filter((member) => member.blockedByMe).map((member) => member.id)
      : [],
  );
  return oldestFirst.map((item, index) => {
    const previous = oldestFirst[index - 1];
    const at = itemTime(item);
    const gap = previous ? Date.parse(at) - Date.parse(itemTime(previous)) : Infinity;
    const mine = item.kind === 'pending' || item.mine;
    const sender = item.kind === 'stored' ? item.message.senderId : null;
    const previousFolded =
      previous?.kind === 'stored' &&
      blocked.has(previous.message.senderId) &&
      !revealed.has(previous.key);
    const previousSender =
      previous?.kind === 'stored' && !previous.mine && !previousFolded
        ? previous.message.senderId
        : null;
    const newSpeaker = sender !== null && !mine && (sender !== previousSender || gap >= BREAK_MS);
    const folded = sender !== null && !mine && blocked.has(sender) && !revealed.has(item.key);
    const seen =
      item.kind === 'stored' && item.message.id === seenMessageId && info?.peerReadAt
        ? readLabel(info.peerReadAt, now, t, language)
        : null;
    return {
      key: item.key,
      item,
      mine,
      body: item.kind === 'pending' ? item.pending.body : item.message.body,
      name: group && newSpeaker && sender && !folded ? senderName(info, sender, t) : null,
      speaker: !mine && sender ? senderName(info, sender, t) : null,
      reportable: !mine,
      folded,
      timeBreak: gap >= BREAK_MS ? breakLabel(at, now, t, language) : null,
      read: seen,
    };
  });
}

const itemState = (row: BubbleRow) =>
  row.item.kind === 'pending'
    ? `${row.item.pending.state}:${row.item.pending.failure ?? ''}`
    : row.item.message.id;
export const sameRow = (a: BubbleRow, b: BubbleRow) =>
  a.body === b.body &&
  itemState(a) === itemState(b) &&
  a.name === b.name &&
  a.speaker === b.speaker &&
  a.reportable === b.reportable &&
  a.folded === b.folded &&
  a.timeBreak === b.timeBreak &&
  a.read === b.read;
