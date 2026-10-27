import type { DraftError } from './types';
import {
  ADDRESS_MAX,
  DESCRIPTION_MAX,
  PLACE_MAX,
  REWARD_MAX_RM,
  REWARD_MIN_RM,
  TIME_AHEAD_MS,
  TITLE_MAX,
} from './validate';

const MAX: Partial<Record<DraftError, number>> = {
  titleTooLong: TITLE_MAX,
  descriptionTooLong: DESCRIPTION_MAX,
  placeTooLong: PLACE_MAX,
  addressTooLong: ADDRESS_MAX,
  rewardRange: REWARD_MAX_RM,
};

export const TIME_AHEAD_DAYS = TIME_AHEAD_MS / 86_400_000;

export function errorKey(error: DraftError) {
  return {
    key: `bounty.post.error.${error}` as const,
    values: { max: MAX[error] ?? 0, min: REWARD_MIN_RM, days: TIME_AHEAD_DAYS },
  };
}
