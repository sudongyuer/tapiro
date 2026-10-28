import type { TFunction } from 'i18next';

import { nameInitial } from '@/lib/nameInitial';

import { ringgit } from '../post/blockedReason';
import { timeLine } from '../post/timeText';
import type { TimeChoice } from '../post/types';
import { tierName, tierRank } from '../shared/tierCopy';
import { formatDistance } from './axis';
import type { BoardRow } from './types';

export function rowTime(row: Pick<BoardRow, 'deadlineAt' | 'startsAt' | 'endsAt'>): TimeChoice {
  if (row.deadlineAt) return { kind: 'deadline', deadlineAt: row.deadlineAt };
  if (row.startsAt && row.endsAt) {
    return { kind: 'window', startsAt: row.startsAt, endsAt: row.endsAt };
  }
  return { kind: 'none' };
}

export function cardCopy(row: BoardRow, t: TFunction, language: string, now: Date) {
  const category = t(`bounty.category.${row.category}`);
  const reward = ringgit(row.rewardSen, language);
  const time = timeLine(rowTime(row), t, language, now);
  const distance = row.distanceM === null ? null : formatDistance(row.distanceM, language);
  const when = row.urgent
    ? time
      ? t('bounty.board.card.urgentLine', { time })
      : t('bounty.board.card.urgent')
    : time;
  const place =
    row.placeLabel === null
      ? t('bounty.board.card.noPlace')
      : distance
        ? t('bounty.board.card.placeLine', { place: row.placeLabel, distance })
        : row.placeLabel;
  const spokenPlace =
    row.placeLabel !== null && distance
      ? t('bounty.board.card.place', { place: row.placeLabel, distance })
      : place;
  const name = row.poster.name ?? t('bounty.post.unknownName');
  const tier = tierName(row.poster.tier, t);
  const label = [
    t('bounty.board.card.label', { category, title: row.title, reward }),
    row.urgent ? t('bounty.board.card.urgent') : null,
    time,
    spokenPlace,
    t('bounty.board.card.poster', { name, tier }),
    row.appliedByMe ? t('bounty.board.card.applied') : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(t('bounty.board.card.separator'));
  return {
    category,
    reward,
    rewardLabel: t('bounty.post.confirm.rewardLabel', { amount: reward }),
    when,
    place,
    name,
    initial: nameInitial(name),
    tier,
    rank: tierRank(row.poster.tier),
    label,
  };
}

export type CardCopy = ReturnType<typeof cardCopy>;
