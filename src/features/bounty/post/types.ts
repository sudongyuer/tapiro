import type { BountyCategory } from '@/lib/stickers/category';

export type PublishArgs = {
  id: string;
  title: string;
  category: BountyCategory;
  reward_sen: number;
  description: string | null;
  place_label: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  starts_at: string | null;
  ends_at: string | null;
  deadline_at: string | null;
};

export type PublishResult = {
  id: string;
  status: string;
  charge: 'free' | 'coin';
  expiresAt: string;
};

export type TimeChoice =
  | { kind: 'none' }
  | { kind: 'deadline'; deadlineAt: string }
  | { kind: 'window'; startsAt: string; endsAt: string };

export type DraftPlace = {
  label: string;
  latitude: number;
  longitude: number;
  address: string | null;
};

export type PostDraft = {
  id: string;
  title: string;
  category: BountyCategory | null;
  rewardText: string;
  description: string | null;
  time: TimeChoice;
  place: DraftPlace | null;
  updatedAt: string;
};

export const DRAFT_ERRORS = [
  'titleEmpty',
  'titleTooLong',
  'categoryEmpty',
  'rewardEmpty',
  'rewardRange',
  'descriptionTooLong',
  'placeEmpty',
  'placeTooLong',
  'addressTooLong',
  'timePast',
  'timeTooFar',
  'windowOrder',
] as const;

export type DraftError = (typeof DRAFT_ERRORS)[number];

export type UnpaidSummary = {
  paymentId: string;
  payeeName: string;
  amountSen: number;
  createdAt: string;
};

export type PostStatus = {
  blocked: boolean;
  unpaid: UnpaidSummary[];
  coins: number;
  freePostsLeft: number;
  freePostsPerMonth: number;
  nextFreeAt: string;
};

export type CostBase =
  | { kind: 'free'; left: number; of: number }
  | { kind: 'coin'; balance: number }
  | { kind: 'none'; nextFreeAt: string };

export type CostLine =
  CostBase | { kind: 'blocked'; unpaid: UnpaidSummary[]; under: CostBase['kind'] };

export type PublishFailure = 'blocked' | 'noBalance' | 'invalid' | 'failed';

export type PublishOutcome =
  { ok: true; result: PublishResult } | { ok: false; reason: PublishFailure };

export type PostService = {
  status(): Promise<PostStatus>;
  publish(args: PublishArgs): Promise<PublishOutcome>;
};
