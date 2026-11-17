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

const NO_BREAK_SPACE = '\u00a0';
const WORD_JOINER = '\u2060';

export const unbroken = (text: string) =>
  [...text.replaceAll(' ', NO_BREAK_SPACE)].join(WORD_JOINER);

export function unbrokenTail(text: string, letters = 4) {
  const all = [...text];
  if (all.length <= letters) return text;
  return `${all.slice(0, -letters).join('')}${all.slice(-letters).join(WORD_JOINER)}`;
}

export const spoken = (text: string) =>
  text.replaceAll(WORD_JOINER, '').replaceAll(NO_BREAK_SPACE, ' ');

function openedDate(pair: ReviewPair, language: string) {
  const opened = Date.parse(pair.closesAt) - REVIEW_WINDOW_DAYS * DAY;
  return noShowDate(new Date(opened).toISOString(), language);
}

export function sheetSubtitle(title: string | null, pair: ReviewPair, language: string) {
  const date = openedDate(pair, language);
  return title ? `${title} · ${date}` : date;
}

export function sheetSubtitleShown(title: string | null, pair: ReviewPair, language: string) {
  const date = unbroken(openedDate(pair, language));
  return title ? `${title}${NO_BREAK_SPACE}· ${date}` : date;
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
