import type { TFunction } from 'i18next';

import { canReview, daysLeft } from '../model';
import type { PendingReview, ReviewPair, ReviewTarget, Role } from '../types';
import { pairName } from './reviewView';

export type ReviewEntry = {
  id: string;
  title: string;
  detail: string | null;
  trailing: string | null;
  label: string;
  target: ReviewTarget | null;
};

const targetOf = (pair: ReviewPair): ReviewTarget | null =>
  pair.counterpart ? { kind: pair.kind, itemId: pair.itemId, reviewee: pair.counterpart.id } : null;

function lines(pair: ReviewPair, now: Date, t: TFunction) {
  const name = pairName(pair, t);
  const days = t('reputation.entry.daysLeft', { count: daysLeft(pair.closesAt, now) });
  switch (pair.state) {
    case 'open':
      return pair.theyReviewed
        ? {
            title: t('reputation.entry.review', { name }),
            detail: `${t('reputation.entry.sealedTheirs', { name })} · ${days}`,
            trailing: null,
          }
        : { title: t('reputation.entry.review', { name }), detail: null, trailing: days };
    case 'sealed':
      return {
        title: t('reputation.entry.reviewed'),
        detail: t('reputation.entry.sealedMine', { name }),
        trailing: canReview(pair) ? t('reputation.entry.edit') : null,
      };
    case 'revealed':
      return {
        title: t('reputation.entry.public'),
        detail: pair.theirs
          ? t('reputation.entry.publicDetail', {
              name,
              face: t(`reputation.face.${pair.theirs.face}`),
            })
          : name,
        trailing: null,
      };
    case 'ended':
      return { title: t('reputation.entry.ended'), detail: name, trailing: null };
  }
}

export function reviewEntry(pair: ReviewPair, now: Date, t: TFunction): ReviewEntry {
  const { title, detail, trailing } = lines(pair, now, t);
  return {
    id: pair.counterpart?.id ?? pair.role,
    title,
    detail,
    trailing,
    label: [title, detail, trailing].filter(Boolean).join(t('reputation.profile.listJoin')),
    target: canReview(pair) ? targetOf(pair) : null,
  };
}

const HOME_LINE: Record<Role, 'helpedYou' | 'helpedThem' | 'rode'> = {
  helper: 'helpedYou',
  poster: 'helpedThem',
  organiser: 'rode',
  rider: 'rode',
};

export const pendingLine = (row: PendingReview, name: string, t: TFunction) =>
  t(`reputation.home.${HOME_LINE[row.role]}`, { title: row.title, name });

export const stillOpen = (row: PendingReview, now: Date) =>
  Date.parse(row.closesAt) > now.getTime();
