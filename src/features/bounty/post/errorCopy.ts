import { formatMoney } from '@/lib/money';

import type { DraftError } from './types';
import {
  ADDRESS_MAX,
  DESCRIPTION_MAX,
  PLACE_MAX,
  POST_CURRENCY,
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

export function rewardRangeValues(language: string, currency = POST_CURRENCY) {
  const { min, max } = rewardLimits(currency);
  return {
    min: formatMoney(min, language, { whole: true }),
    max: formatMoney(max, language, { whole: true }),
  };
}

export function errorKey(error: DraftError, language: string) {
  const values =
    error === 'rewardRange'
      ? rewardRangeValues(language)
      : { max: MAX[error] ?? 0, days: TIME_AHEAD_DAYS };
  return { key: `bounty.post.error.${error}` as const, values };
}
