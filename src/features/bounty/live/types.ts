import type { BountyCategory } from '@/lib/stickers/category';

import type { BountyStatus, PostCharge } from '../status/types';

export const LIVE_ROLES = ['poster', 'helper', 'applicant'] as const;
export type LiveRole = (typeof LIVE_ROLES)[number];

export const LIVE_KINDS = ['bountyAction', 'bountyInProgress', 'oneTime'] as const;
export type LiveKind = (typeof LIVE_KINDS)[number];

export const LIVE_ACTIONS = ['choose', 'start', 'confirm', 'resolveIssue'] as const;
export type LiveAction = (typeof LIVE_ACTIONS)[number];

export const SEEN_CARDS = ['not_selected', 'expired'] as const;
export type SeenCard = (typeof SEEN_CARDS)[number];

export type LiveRow = {
  bountyId: string;
  title: string;
  category: BountyCategory;
  rewardSen: number;
  role: LiveRole;
  kind: LiveKind;
  action: LiveAction | null;
  card: SeenCard | null;
  status: BountyStatus;
  counterpartName: string | null;
  applicantCount: number | null;
  startsAt: string | null;
  startLate: boolean;
  etaAt: string | null;
  previousEtaAt: string | null;
  autoConfirmAt: string | null;
  issueReason: string | null;
  refund: PostCharge | null;
};

export type LiveBountyService = {
  list(): Promise<LiveRow[]>;
  markSeen(bountyId: string, card: SeenCard): Promise<boolean>;
};
