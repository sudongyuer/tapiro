import type { TFunction } from 'i18next';

import { canReview, daysLeft } from '../model';
import type { PendingReview, ReviewPair, ReviewTarget, Role } from '../types';
import { pairName, windowOver } from './reviewView';

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

function lines(pair: ReviewPair, over: boolean, canOpen: boolean, now: Date, t: TFunction) {
  const name = pairName(pair, t);
  const days = t('reputation.entry.daysLeft', { count: daysLeft(pair.closesAt, now) });
  if (pair.state === 'ended' || (pair.state === 'open' && over)) {
    return { title: t('reputation.entry.ended'), detail: name, trailing: null };
  }
  if (pair.state === 'revealed') {
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
  }
  if (pair.state === 'sealed') {
    return {
      title: t('reputation.entry.reviewed'),
      detail: t('reputation.entry.sealedMine', { name }),
      trailing: canOpen ? t('reputation.entry.edit') : null,
    };
  }
  const title = t('reputation.entry.review', { name });
  return pair.theyReviewed
    ? {
        title,
        detail: `${t('reputation.entry.sealedTheirs', { name })} · ${days}`,
        trailing: null,
      }
    : { title, detail: null, trailing: days };
}

export function reviewEntry(pair: ReviewPair, index: number, now: Date, t: TFunction): ReviewEntry {
  const over = windowOver(pair, now);
  const target = canReview(pair) && !over ? targetOf(pair) : null;
  const { title, detail, trailing } = lines(pair, over, target !== null, now, t);
  return {
    id: pair.counterpart?.id ?? `${pair.role}-${index}`,
    title,
    detail,
    trailing,
    label: [title, detail, trailing].filter(Boolean).join(t('reputation.profile.listJoin')),
    target,
  };
}

const HOME_LINE: Record<Role, 'helpedYou' | 'helpedThem' | 'rode'> = {
  helper: 'helpedYou',
  poster: 'helpedThem',
  organiser: 'rode',
  rider: 'rode',
};

const TITLE_SHOWN = 24;

export function shortTitle(title: string) {
  const letters = [...title];
  return letters.length > TITLE_SHOWN ? `${letters.slice(0, TITLE_SHOWN).join('')}…` : title;
}

export const pendingLine = (row: PendingReview, name: string, title: string, t: TFunction) =>
  t(`reputation.home.${HOME_LINE[row.role]}`, { title, name });

export const stillOpen = (row: PendingReview, now: Date) =>
  Date.parse(row.closesAt) > now.getTime();
