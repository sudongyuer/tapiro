import type { ReportReason } from '@/lib/report';

export const ITEM_KINDS = ['bounty', 'ride'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const FACES = ['happy', 'okay', 'unhappy'] as const;
export type Face = (typeof FACES)[number];

export const ROLES = ['helper', 'poster', 'organiser', 'rider'] as const;
export type Role = (typeof ROLES)[number];

export const CHIPS = {
  helper: {
    good: ['on_time', 'careful', 'kept_posted', 'extra_kind'],
    notGood: ['late', 'no_heads_up', 'unfinished', 'item_damaged'],
  },
  poster: {
    good: ['clear_ask', 'paid_promptly', 'easy_to_talk', 'polite'],
    notGood: ['not_as_described', 'slow_to_pay', 'changed_ask', 'rude'],
  },
  organiser: {
    good: ['left_on_time', 'fair_split', 'clear_meetup', 'good_company'],
    notGood: ['late', 'cancelled_late', 'wrong_fare', 'rude'],
  },
  rider: {
    good: ['on_time', 'paid_promptly', 'good_company', 'considerate'],
    notGood: ['late', 'luggage_unmentioned', 'slow_to_pay', 'rude'],
  },
} as const satisfies Record<Role, { good: readonly string[]; notGood: readonly string[] }>;

export type Chip = (typeof CHIPS)[Role]['good' | 'notGood'][number];

export const CHIPS_MAX = 4;
export const REVIEW_TEXT_MAX = 200;
export const REVIEW_PAGE_SIZE = 20;

export const TIERS = ['new_friend', 'reliable', 'very_reliable', 'tapir_friend'] as const;
export type Tier = (typeof TIERS)[number];

export const ACCESSORIES = ['red_hat', 'backpack', 'umbrella', 'scarf'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export type Person = { id: string; name: string | null; avatarUrl: string | null };

export type Reply = { body: string; createdAt: string };

export type Review = {
  id: string;
  face: Face;
  chips: string[];
  sentence: string | null;
  submittedAt: string;
  shownAt: string | null;
  reply: Reply | null;
};

export type MyReview = Review & { editable: boolean };

export const PAIR_STATES = ['open', 'sealed', 'revealed', 'ended'] as const;
export type PairState = (typeof PAIR_STATES)[number];

export type ReviewPair = {
  kind: ItemKind;
  itemId: string;
  counterpart: Person | null;
  role: Role;
  closesAt: string;
  state: PairState;
  theyReviewed: boolean;
  mine: MyReview | null;
  theirs: Review | null;
};

export type PendingReview = {
  kind: ItemKind;
  itemId: string;
  title: string;
  counterpart: Person | null;
  role: Role;
  closesAt: string;
  theyReviewed: boolean;
};

export type ReviewDraft = { face: Face | null; chips: string[]; sentence: string };

export type ReviewTarget = { kind: ItemKind; itemId: string; reviewee: string };

export const SUBMIT_FAILURES = ['closed', 'locked', 'invalid', 'notFound', 'failed'] as const;
export type SubmitFailure = (typeof SUBMIT_FAILURES)[number];

export type SubmitResult = { ok: true; pair: ReviewPair } | { ok: false; failure: SubmitFailure };

export const REPLY_FAILURES = ['alreadyReplied', 'invalid', 'notFound', 'failed'] as const;
export type ReplyFailure = (typeof REPLY_FAILURES)[number];

export type ReplyResult =
  { ok: true; reviewId: string; reply: Reply } | { ok: false; failure: ReplyFailure };

export type ReviewReportResult = 'sent' | 'gone';

export type ProfileReview = Review & {
  kind: ItemKind;
  role: Role;
  title: string | null;
  reviewer: Person | null;
  reviewerBlockedByMe: boolean;
  reportable: boolean;
};

export type FaceCounts = Record<Face, number>;

export type PublicMascot = { level: number; stickers: number; accessory: Accessory | null };

export type ProfileCard = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  self: boolean;
  blockedByMe: boolean;
  tier: Tier;
  helped: number;
  settled: number;
  completionRate: number | null;
  reviewCount: number;
  faces: FaceCounts;
  latestReviews: ProfileReview[];
  mascot: PublicMascot;
};

export type ReviewPage = { items: ProfileReview[]; hasMore: boolean; nextCursor: string | null };

export type MyMascot = PublicMascot & {
  seenLevel: number;
  levelUp: boolean;
  nextLevelAt: number;
  chosenAccessory: Accessory | null;
  unlocked: Accessory[];
};

export type TierDropNoShow = { at: string; kind: ItemKind; title: string | null };

export type TierDrop = {
  id: number;
  from: Tier;
  to: Tier;
  droppedAt: string;
  noShows: TierDropNoShow[];
  noShowCount: number;
  negativeReviews: number;
  settled: number;
  people: number;
  toRegain: { tier: Tier; settled: number; newPeople: number; goodReviews: number };
};

export const ACCESSORY_FAILURES = ['locked', 'failed'] as const;
export type AccessoryFailure = (typeof ACCESSORY_FAILURES)[number];

export type ReputationService = {
  reviewState(kind: ItemKind, itemId: string): Promise<ReviewPair[]>;
  pendingReviews(): Promise<PendingReview[]>;
  submitReview(target: ReviewTarget, draft: ValidDraft): Promise<SubmitResult>;
  reply(reviewId: string, body: string): Promise<ReplyResult>;
  profile(personId: string): Promise<ProfileCard>;
  profileReviews(personId: string, before: string | null): Promise<ReviewPage>;
  myMascot(): Promise<MyMascot>;
  markLevelSeen(level: number): Promise<MyMascot>;
  setAccessory(accessory: Accessory | null): Promise<MyMascot>;
  pendingTierDrop(): Promise<TierDrop | null>;
  markTierDropSeen(id: number): Promise<void>;
  reportPerson(personId: string, reason: ReportReason, note: string | null): Promise<void>;
  reportReview(
    reviewId: string,
    reason: ReportReason,
    note: string | null,
  ): Promise<ReviewReportResult>;
};

export type ValidDraft = { face: Face; chips: string[]; sentence: string | null };

export const pairKey = (kind: ItemKind, itemId: string) => `${kind}:${itemId}`;

export const targetKey = ({ kind, itemId, reviewee }: ReviewTarget) =>
  `${kind}:${itemId}:${reviewee}`;
