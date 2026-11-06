import type { TFunction } from 'i18next';

import { levelNameKey, levelStartsAt } from '../model';
import { TIERS, type Face, type ProfileCard, type ProfileReview, type Tier } from '../types';

export type TierRank = 1 | 2 | 3 | 4;

export const tierRank = (tier: Tier) => (TIERS.indexOf(tier) + 1) as TierRank;

export const tierLabel = (tier: Tier, t: TFunction) => t(`bounty.tier.${tier}`);

export const personName = (name: string | null, t: TFunction) => name ?? t('reputation.someone');

export function rateText(rate: number | null, language: string) {
  if (rate === null) return null;
  return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(
    Math.min(1, Math.max(0, rate)),
  );
}

export const countText = (count: number, language: string) =>
  new Intl.NumberFormat(language).format(count);

export const faceTone = (face: Face) =>
  face === 'happy' ? '--color-success' : face === 'unhappy' ? '--color-urgent' : null;

export function chipLabels(review: ProfileReview, t: TFunction) {
  return review.chips
    .map((chip) => t(`reputation.chip.${review.role}.${chip}`, { defaultValue: '' }))
    .filter((label) => label !== '');
}

export function reviewSource(review: ProfileReview, t: TFunction) {
  const what = review.title ?? (review.kind === 'ride' ? t('reputation.profile.ride') : null);
  const who = review.reviewer ? personName(review.reviewer.name, t) : null;
  return [who, what].filter((part): part is string => part !== null).join(' · ');
}

export function reviewLine(review: ProfileReview, t: TFunction) {
  return [t(`reputation.face.${review.face}`), ...chipLabels(review, t)].join(' · ');
}

export function reviewLabel(review: ProfileReview, owner: string, self: boolean, t: TFunction) {
  const reply = review.reply
    ? self
      ? `${t('reputation.reply.mine')}${review.reply.body}`
      : `${t('reputation.reply.theirs', { name: owner })}${review.reply.body}`
    : null;
  return [reviewLine(review, t), review.sentence, reviewSource(review, t), reply]
    .filter((part): part is string => !!part)
    .join(t('reputation.profile.listJoin'));
}

export const canReply = (card: Pick<ProfileCard, 'self'>, review: ProfileReview) =>
  card.self && review.reply === null;

export const showsAllReviews = (card: ProfileCard) => card.reviewCount > card.latestReviews.length;

export const isNewcomer = (card: ProfileCard) => card.settled === 0;

export function levelLabel(level: number, t: TFunction) {
  return t('reputation.level.label', {
    level,
    name: t(levelNameKey(level) as 'reputation.level.lv1'),
  });
}

export function levelProgress(level: number, stickers: number) {
  const from = levelStartsAt(level);
  const next = levelStartsAt(level + 1);
  const span = Math.max(1, next - from);
  return {
    next: level + 1,
    toGo: Math.max(0, next - stickers),
    fraction: Math.min(1, Math.max(0, (stickers - from) / span)),
  };
}
