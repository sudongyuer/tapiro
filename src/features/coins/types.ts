export const COIN_REASONS = [
  'new_user',
  'onboarding_payee_method',
  'onboarding_first_post',
  'onboarding_first_help',
  'help_settled',
  'post_spend',
  'post_refund',
  'weekly_feed',
  'invite_inviter',
  'invite_invitee',
] as const;
export type CoinReason = (typeof COIN_REASONS)[number];

export const ITEM_KINDS = ['bounty', 'ride'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export type CoinBalance = {
  coins: number;
  freePostsLeft: number;
  freePostsPerMonth: number;
  nextFreeAt: string;
};

export type CoinRow = {
  id: number;
  reason: CoinReason | 'other';
  delta: number;
  at: string;
  month: string;
  item: { kind: ItemKind; id: string; title: string | null } | null;
};

export type HistoryPage = { items: CoinRow[]; hasMore: boolean; nextCursor: number | null };

export const HISTORY_PAGE_SIZE = 50;

export type FeedStatus = { fedThisWeek: boolean; nextWeekAt: string; coins: number };

export type FeedResult = FeedStatus & { status: 'fed' | 'already_fed' };

export type Person = { id: string; name: string | null; avatarUrl: string | null };

export type InvitedFriend = {
  person: Person | null;
  redeemedAt: string;
  rewardedAt: string | null;
};

export type Invite = {
  code: string | null;
  reward: number;
  redeemed: { code: string; inviter: Person | null; rewarded: boolean } | null;
  canRedeem: boolean;
  invited: InvitedFriend[];
};

export const REDEEM_FAILURES = [
  'notFound',
  'ownCode',
  'alreadyRedeemed',
  'tooLate',
  'mutual',
  'malformed',
  'failed',
] as const;
export type RedeemFailure = (typeof REDEEM_FAILURES)[number];

export type RedeemResult = { ok: true; invite: Invite } | { ok: false; failure: RedeemFailure };

export type CoinsService = {
  balance(): Promise<CoinBalance>;
  history(before: number | null): Promise<HistoryPage>;
  feedStatus(): Promise<FeedStatus>;
  feed(): Promise<FeedResult>;
  invite(): Promise<Invite>;
  redeem(code: string): Promise<RedeemResult>;
};
