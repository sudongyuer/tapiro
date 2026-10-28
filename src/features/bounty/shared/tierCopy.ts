import type { TFunction } from 'i18next';

import { TIERS, type Tier } from '../board/types';

export type TierRank = 1 | 2 | 3 | 4;

export const tierRank = (tier: Tier) => (TIERS.indexOf(tier) + 1) as TierRank;

export const tierName = (tier: Tier, t: TFunction) => t(`bounty.tier.${tier}`);
