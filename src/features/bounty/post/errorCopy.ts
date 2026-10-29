import { formatMoneyRange, type CurrencyCode } from '@/lib/money';

import type { DraftError } from './types';
import {
  ADDRESS_MAX,
  DESCRIPTION_MAX,
  PLACE_MAX,
  rewardLimits,
  TIME_AHEAD_MS,
  TITLE_MAX,
} from './validate';

const MAX: Partial<Record<DraftError, number>> = {
  titleTooLong: TITLE_MAX,
  descriptionTooLong: DESCRIPTION_MAX,
  placeTooLong: PLACE_MAX,
  addressTooLong: ADDRESS_MAX,
};

export const TIME_AHEAD_DAYS = TIME_AHEAD_MS / 86_400_000;

export function rewardRangeText(language: string, currency: CurrencyCode) {
  const { min, max } = rewardLimits(currency);
  return formatMoneyRange(min, max, language);
}

export function errorKey(error: DraftError, language: string, currency: CurrencyCode) {
  const values =
    error === 'rewardRange'
      ? { range: rewardRangeText(language, currency) }
      : { max: MAX[error] ?? 0, days: TIME_AHEAD_DAYS };
  return { key: `bounty.post.error.${error}` as const, values };
}
