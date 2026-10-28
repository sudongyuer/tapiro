import type { TFunction } from 'i18next';

import { nameInitial } from '@/lib/nameInitial';

import { formatDistance } from '../board/axis';
import { rowTime } from '../board/cardCopy';
import { ringgit } from '../post/blockedReason';
import { timeLine } from '../post/timeText';
import { tierName, tierRank } from '../shared/tierCopy';
import type { DetailView } from './detailState';

const MINUTE_MS = 60_000;
const URGENT_MS = 3 * 60 * MINUTE_MS;

export function urgentLine(deadlineAt: string | null, t: TFunction, now: Date) {
  if (!deadlineAt) return null;
  const left = new Date(deadlineAt).getTime() - now.getTime();
  if (left <= 0 || left > URGENT_MS) return null;
  const minutes = Math.ceil(left / MINUTE_MS);
  if (minutes < 60) return t('bounty.detail.urgentMinutes', { count: minutes, minutes });
  const hours = Math.floor(minutes / 60);
  return t('bounty.detail.urgentHours', { count: hours, hours });
}

export function detailCopy(view: DetailView, t: TFunction, language: string, now: Date) {
  const reward = ringgit(view.rewardSen, language);
  const name = view.poster.name ?? t('bounty.post.unknownName');
  return {
    reward,
    rewardLabel: t('bounty.post.confirm.rewardLabel', { amount: reward }),
    time: timeLine(rowTime(view), t, language, now),
    urgent: urgentLine(view.deadlineAt, t, now),
    placeHint:
      view.placeLabel !== null && view.distanceM !== null
        ? t('bounty.detail.placeHint', { distance: formatDistance(view.distanceM, language) })
        : null,
    name,
    initial: nameInitial(name),
    tier: tierName(view.poster.tier, t),
    rank: tierRank(view.poster.tier),
  };
}

export type DetailCopy = ReturnType<typeof detailCopy>;
