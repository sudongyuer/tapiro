import { createReviewDrafts, type SettingsLike } from './drafts';
import type {
  MyMascot,
  PendingReview,
  ProfileCard,
  ProfileReview,
  ReputationService,
  ReviewPair,
} from './types';

export const ME = 'me';

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

export function memorySettings(): SettingsLike & { values: Record<string, unknown> } {
  const values: Record<string, unknown> = {};
  return {
    values,
    get: (key) => values[key],
    set(next) {
      Object.assign(values, next);
    },
  };
}

export const memoryDrafts = (settings = memorySettings()) => ({
  settings,
  drafts: createReviewDrafts(settings),
});

export const person = (id: string, name = id) => ({ id, name, avatarUrl: null });

export const pair = (overrides: Partial<ReviewPair> = {}): ReviewPair => ({
  kind: 'bounty',
  itemId: 'b1',
  counterpart: person('p1', '小林'),
  role: 'helper',
  closesAt: '2026-11-13T01:00:00Z',
  state: 'open',
  theyReviewed: false,
  mine: null,
  theirs: null,
  ...overrides,
});

export const pending = (overrides: Partial<PendingReview> = {}): PendingReview => ({
  kind: 'bounty',
  itemId: 'b1',
  title: '帮取快递',
  counterpart: person('p1', '小林'),
  role: 'helper',
  closesAt: '2026-11-13T01:00:00Z',
  theyReviewed: false,
  ...overrides,
});

export const sealed = (from: ReviewPair, face: 'happy' | 'okay' | 'unhappy' = 'happy') => ({
  ...from,
  state: 'sealed' as const,
  mine: {
    id: 'r1',
    face,
    chips: [],
    sentence: null,
    submittedAt: '2026-11-06T01:00:00Z',
    shownAt: null,
    reply: null,
    editable: true,
  },
});

export const profileReview = (
  id: string,
  overrides: Partial<ProfileReview> = {},
): ProfileReview => ({
  id,
  face: 'happy',
  chips: ['on_time'],
  sentence: null,
  submittedAt: '2026-11-05T01:00:00Z',
  shownAt: '2026-11-06T01:00:00Z',
  reply: null,
  kind: 'bounty',
  role: 'helper',
  title: '帮取快递',
  reviewer: person('p2', '阿明'),
  ...overrides,
});

export const card = (overrides: Partial<ProfileCard> = {}): ProfileCard => ({
  id: 'p1',
  name: 'Mei',
  avatarUrl: null,
  joinedAt: '2026-05-01T00:00:00Z',
  self: true,
  blockedByMe: false,
  tier: 'reliable',
  helped: 2,
  settled: 3,
  completionRate: null,
  reviewCount: 1,
  faces: { happy: 1, okay: 0, unhappy: 0 },
  latestReviews: [profileReview('r1')],
  mascot: { level: 2, stickers: 3, accessory: 'red_hat' },
  ...overrides,
});

export const mascot = (overrides: Partial<MyMascot> = {}): MyMascot => ({
  level: 2,
  stickers: 3,
  accessory: 'red_hat',
  seenLevel: 1,
  levelUp: true,
  nextLevelAt: 8,
  chosenAccessory: null,
  unlocked: ['red_hat'],
  ...overrides,
});

const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected ${name}`));

export function fakeService(overrides: Partial<ReputationService> = {}): ReputationService {
  return {
    reviewState: unexpected('reviewState'),
    pendingReviews: unexpected('pendingReviews'),
    submitReview: unexpected('submitReview'),
    reply: unexpected('reply'),
    profile: unexpected('profile'),
    profileReviews: unexpected('profileReviews'),
    myMascot: unexpected('myMascot'),
    markLevelSeen: unexpected('markLevelSeen'),
    setAccessory: unexpected('setAccessory'),
    pendingTierDrop: unexpected('pendingTierDrop'),
    markTierDropSeen: unexpected('markTierDropSeen'),
    reportPerson: unexpected('reportPerson'),
    ...overrides,
  };
}
