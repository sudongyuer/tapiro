import type { TFunction } from 'i18next';

import { addDays, localClock, localDayKey } from '@/lib/deviceClock';
import type { ArtSource, HandArtId } from '@/lib/handArt';

import type { ThreadInfo, ThreadSummary } from '../types';

export type RowArt = { kind: 'bounty'; source: ArtSource } | { kind: 'ride'; id: HandArtId };

export type RowView = {
  art: RowArt;
  title: string;
  side: string;
  last: string;
  time: string;
  unread: boolean;
  a11y: string;
};

const WEEK_DAYS = 6;

const oneLine = (body: string) => body.replace(/\s+/g, ' ');

export function rowTime(at: string, now: number, t: TFunction, language: string) {
  const time = Date.parse(at);
  const day = localDayKey(time);
  const today = localDayKey(now);
  if (day === today) return localClock(time);
  if (day === addDays(today, -1)) return t('chat.list.yesterday');
  const date = new Date(time);
  if (day >= addDays(today, -WEEK_DAYS) && day < today) {
    return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date);
  }
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(language, {
    ...(sameYear ? {} : { year: 'numeric' }),
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function sideText(row: ThreadSummary, t: TFunction) {
  if (row.left) return t('chat.list.left');
  if (row.kind === 'ride') {
    const count = row.members.filter((member) => !member.left).length + 1;
    return t('chat.list.people', { count });
  }
  return otherName(row, t);
}

function otherName(info: ThreadInfo, t: TFunction) {
  const other = info.members.find((member) => !member.left) ?? info.members[0];
  return other?.name ?? t('chat.list.someone');
}

export function threadTitle(info: ThreadInfo, t: TFunction) {
  if (info.item.kind === 'ride') {
    return t('chat.list.route', { from: info.item.from, to: info.item.to });
  }
  return otherName(info, t);
}

function lastText(row: ThreadSummary, me: string, t: TFunction) {
  const last = row.lastMessage;
  if (!last) return t('chat.list.noMessage');
  const body = oneLine(last.body);
  if (last.senderId === me) return t('chat.list.mine', { body });
  if (row.kind === 'bounty') return body;
  const sender = row.members.find((member) => member.id === last.senderId);
  if (sender?.blockedByMe) return t('chat.thread.folded');
  return t('chat.list.from', { name: sender?.name ?? t('chat.list.someone'), body });
}

export function rowView(
  row: ThreadSummary,
  me: string,
  now: number,
  t: TFunction,
  language: string,
): RowView {
  const item = row.item;
  const art: RowArt =
    item.kind === 'bounty'
      ? { kind: 'bounty', source: { art: item.art, category: item.category, title: item.title } }
      : { kind: 'ride', id: 'car' };
  const title =
    item.kind === 'bounty' ? item.title : t('chat.list.route', { from: item.from, to: item.to });
  const side = sideText(row, t);
  const last = lastText(row, me, t);
  const time = rowTime(row.lastMessage?.createdAt ?? row.createdAt, now, t, language);
  const label = t('chat.list.a11y', { title, side, last, time });
  return {
    art,
    title,
    side,
    last,
    time,
    unread: row.unread,
    a11y: row.unread ? t('chat.list.a11yUnread', { label }) : label,
  };
}
