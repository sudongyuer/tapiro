import type { TFunction } from 'i18next';

import { canReview, draftChanged, textLength } from '../model';
import { personName } from '../profile/profileView';
import { noShowDate } from '../tierDrop/tierDropView';
import {
  REVIEW_TEXT_MAX,
  type ReviewDraft,
  type ReviewPair,
  type ReviewTarget,
  type SubmitFailure,
} from '../types';

const DAY = 86_400_000;
const REVIEW_WINDOW_DAYS = 7;

export const pairName = (pair: ReviewPair, t: TFunction) =>
  personName(pair.counterpart?.name ?? null, t);

export function sheetSubtitle(title: string | null, pair: ReviewPair, language: string) {
  const opened = Date.parse(pair.closesAt) - REVIEW_WINDOW_DAYS * DAY;
  const date = noShowDate(new Date(opened).toISOString(), language);
  return title ? `${title} · ${date}` : date;
}

export const windowOver = (pair: ReviewPair, now: Date) =>
  Date.parse(pair.closesAt) <= now.getTime();

export function blockedBy(pair: ReviewPair, now: Date): SubmitFailure | null {
  if (canReview(pair) && !windowOver(pair, now)) return null;
  return pair.state === 'ended' || pair.state === 'open' ? 'closed' : 'locked';
}

export function canSend(draft: ReviewDraft, base: ReviewDraft, pair: ReviewPair) {
  if (!draft.face || textLength(draft.sentence) > REVIEW_TEXT_MAX) return false;
  return pair.mine === null || draftChanged(draft, base);
}

export const findPair = (pairs: readonly ReviewPair[], target: ReviewTarget) =>
  pairs.find((pair) => pair.counterpart?.id === target.reviewee) ?? null;
