import type { TFunction } from 'i18next';

import { canReview, daysLeft } from '../model';
import type { PendingReview, ReviewPair, ReviewTarget, Role } from '../types';
import { pairName, spoken, unbroken, windowOver } from './reviewView';

export type ReviewEntry = {
  id: string;
  title: string;
  detail: string | null;
  trailing: string | null;
  trailingIsAction: boolean;
  label: string;
  target: ReviewTarget | null;
};

const targetOf = (pair: ReviewPair): ReviewTarget | null =>
  pair.counterpart ? { kind: pair.kind, itemId: pair.itemId, reviewee: pair.counterpart.id } : null;

function lines(pair: ReviewPair, over: boolean, canOpen: boolean, now: Date, t: TFunction) {
  const name = pairName(pair, t);
  const days = unbroken(t('reputation.entry.daysLeft', { count: daysLeft(pair.closesAt, now) }));
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
        detail: `${t('reputation.entry.sealedTheirs', { name })}\u00a0· ${days}`,
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
    trailingIsAction: pair.state === 'sealed' && trailing !== null,
    label: spoken([title, detail, trailing].filter(Boolean).join(t('reputation.profile.listJoin'))),
    target,
  };
}

const HOME_LINE: Record<Role, 'helpedYou' | 'helpedThem' | 'rode'> = {
  helper: 'helpedYou',
  poster: 'helpedThem',
  organiser: 'rode',
  rider: 'rode',
};

const NAME_SHOWN = 16;

export function shortName(name: string) {
  const letters = [...name];
  return letters.length > NAME_SHOWN ? `${letters.slice(0, NAME_SHOWN).join('')}…` : name;
}

export const pendingWho = (row: PendingReview, name: string, t: TFunction) =>
  t(`reputation.home.${HOME_LINE[row.role]}`, { name });

export const pendingLabel = (row: PendingReview, name: string, t: TFunction) =>
  `${row.title} · ${pendingWho(row, name, t)}`;

export const stillOpen = (row: PendingReview, now: Date) =>
  Date.parse(row.closesAt) > now.getTime();
