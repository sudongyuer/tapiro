import {
  FIXTURE_PEOPLE,
  FIXTURE_REP_USER_ID,
  fixtureMascot,
  fixturePairs,
  fixturePending,
  fixtureProfile,
  fixtureReviews,
  fixtureTierDrop,
  type RepVariant,
} from './fixtureData';
import { accessoryLevel, mascotLevel } from './model';
import { AccessoryError, ProfileGoneError } from './reputationService';
import {
  pairKey,
  REVIEW_PAGE_SIZE,
  type MyMascot,
  type ProfileReview,
  type ReputationService,
  type ReviewPair,
} from './types';

export const REP_FAIL_POINTS = [
  'state',
  'pending',
  'submit',
  'reply',
  'profile',
  'reviews',
  'mascot',
  'accessory',
  'tierDrop',
  'report',
  'profileAgain',
] as const;
export type RepFailPoint = (typeof REP_FAIL_POINTS)[number];

export type FixtureRepOptions = {
  variant: RepVariant;
  failFirst?: readonly RepFailPoint[];
  delayMs?: number;
  now?: () => Date;
  onCall?: (name: string, args: unknown) => void;
  isBlocked?: (personId: string) => boolean;
};

export const FIXTURE_GONE_PERSON_ID = 'fixture-person-gone';

const RIDE_ROUTE = '双威 → KLIA2';

function seenBy(personId: string, rows: ProfileReview[]) {
  if (personId !== FIXTURE_REP_USER_ID) return rows;
  return rows.map((row) =>
    row.kind === 'ride' ? { ...row, title: RIDE_ROUTE, reviewer: FIXTURE_PEOPLE.mei } : row,
  );
}

export function fixtureRepFailPoints(value: string | undefined): RepFailPoint[] {
  const parts = (value ?? '').split(',').map((part) => part.trim());
  return REP_FAIL_POINTS.filter((point) => parts.includes(point));
}

export function createFixtureReputationService({
  variant,
  failFirst = [],
  delayMs = 0,
  now = () => new Date(),
  onCall,
  isBlocked = () => false,
}: FixtureRepOptions): ReputationService {
  const failing = new Set<RepFailPoint>(
    variant === 'failed' ? REP_FAIL_POINTS.filter((point) => point !== 'profileAgain') : failFirst,
  );
  const data = variant === 'failed' ? 'many' : variant;
  const items = new Map<string, ReviewPair[]>();
  const reviews = fixtureReviews(data, now());
  let mascot: MyMascot = fixtureMascot(data);
  let tierDrop = fixtureTierDrop(data, now());
  let pending = fixturePending(data, now());
  let profileReads = 0;

  async function step(point: RepFailPoint, name: string, args: unknown = null) {
    onCall?.(name, args);
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (failing.delete(point)) throw new Error(`fixture ${point} failed`);
  }

  const pairsOf = (kind: ReviewPair['kind'], itemId: string) => {
    const key = pairKey(kind, itemId);
    const stored = items.get(key) ?? fixturePairs(kind, itemId, data, now());
    items.set(key, stored);
    return stored;
  };

  return {
    async reviewState(kind, itemId) {
      await step('state', 'reviewState', { kind, itemId });
      return pairsOf(kind, itemId);
    },
    async pendingReviews() {
      await step('pending', 'pendingReviews');
      return pending;
    },
    async submitReview(target, draft) {
      try {
        await step('submit', 'submitReview', { target, draft });
      } catch {
        return { ok: false, failure: 'failed' };
      }
      const pairs = pairsOf(target.kind, target.itemId);
      const pair = pairs.find((row) => row.counterpart?.id === target.reviewee);
      if (!pair) return { ok: false, failure: 'notFound' };
      if (pair.state === 'ended' || pair.state === 'revealed') {
        return { ok: false, failure: pair.state === 'ended' ? 'closed' : 'locked' };
      }
      const revealed = pair.theyReviewed;
      const at = now().toISOString();
      const next: ReviewPair = {
        ...pair,
        state: revealed ? 'revealed' : 'sealed',
        mine: {
          id: pair.mine?.id ?? `fixture-review-${target.reviewee}`,
          ...draft,
          submittedAt: at,
          shownAt: revealed ? at : null,
          reply: null,
          editable: !revealed,
        },
        theirs: revealed
          ? {
              id: `fixture-review-from-${target.reviewee}`,
              face: 'happy',
              chips: [],
              sentence: null,
              submittedAt: at,
              shownAt: at,
              reply: null,
            }
          : null,
      };
      items.set(
        pairKey(target.kind, target.itemId),
        pairs.map((row) => (row === pair ? next : row)),
      );
      pending = pending.filter(
        (row) =>
          !(
            row.kind === target.kind &&
            row.itemId === target.itemId &&
            row.counterpart?.id === target.reviewee
          ),
      );
      return { ok: true, pair: next };
    },
    async reply(reviewId, body) {
      try {
        await step('reply', 'reply', { reviewId, body });
      } catch {
        return { ok: false, failure: 'failed' };
      }
      const row = reviews.find((candidate) => candidate.id === reviewId);
      if (!row) return { ok: false, failure: 'notFound' };
      if (row.reply && row.reply.body !== body) return { ok: false, failure: 'alreadyReplied' };
      row.reply ??= { body, createdAt: now().toISOString() };
      return { ok: true, reviewId, reply: row.reply };
    },
    async profile(personId) {
      profileReads += 1;
      await step(
        profileReads > 1 && failing.has('profileAgain') ? 'profileAgain' : 'profile',
        'profile',
        {
          personId,
        },
      );
      if (personId === FIXTURE_GONE_PERSON_ID) throw new ProfileGoneError();
      return {
        ...fixtureProfile(personId, data, now(), seenBy(personId, reviews)),
        blockedByMe: isBlocked(personId),
      };
    },
    async profileReviews(personId, before) {
      await step('reviews', 'profileReviews', { personId, before });
      const from = before ? reviews.findIndex((row) => row.id === before) + 1 : 0;
      const page: ProfileReview[] = seenBy(personId, reviews.slice(from, from + REVIEW_PAGE_SIZE));
      const hasMore = reviews.length > from + REVIEW_PAGE_SIZE;
      return { items: page, hasMore, nextCursor: hasMore ? page[page.length - 1].id : null };
    },
    async myMascot() {
      await step('mascot', 'myMascot');
      return mascot;
    },
    async markLevelSeen(level) {
      await step('mascot', 'markLevelSeen', { level });
      const seenLevel = Math.max(mascot.seenLevel, Math.min(level, mascotLevel(mascot.stickers)));
      mascot = { ...mascot, seenLevel, levelUp: mascot.level > seenLevel };
      return mascot;
    },
    async setAccessory(accessory) {
      try {
        await step('accessory', 'setAccessory', { accessory });
      } catch {
        throw new AccessoryError('failed');
      }
      if (accessory && accessoryLevel(accessory) > mascot.level) throw new AccessoryError('locked');
      mascot = {
        ...mascot,
        chosenAccessory: accessory,
        accessory: accessory ?? mascot.unlocked[mascot.unlocked.length - 1] ?? null,
      };
      return mascot;
    },
    async pendingTierDrop() {
      await step('tierDrop', 'pendingTierDrop');
      return tierDrop;
    },
    async markTierDropSeen(id) {
      await step('tierDrop', 'markTierDropSeen', { id });
      if (tierDrop && tierDrop.id <= id) tierDrop = null;
    },
    async reportPerson(personId, reason, note) {
      await step('report', 'reportPerson', { personId, reason, note });
    },
  };
}

export { FIXTURE_REP_USER_ID };
