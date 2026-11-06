import {
  ACCESSORIES,
  FACES,
  ITEM_KINDS,
  PAIR_STATES,
  ROLES,
  TIERS,
  type FaceCounts,
  type MyMascot,
  type MyReview,
  type PendingReview,
  type Person,
  type ProfileCard,
  type ProfileReview,
  type PublicMascot,
  type Reply,
  type Review,
  type ReviewPage,
  type ReviewPair,
  type TierDrop,
  type TierDropNoShow,
} from './types';

const fail = (what: string): never => {
  throw new Error(`reputation: unexpected ${what}`);
};

const body = (value: unknown, what: string) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail(what);

const text = (value: unknown, what: string) =>
  typeof value === 'string' && value.length > 0 ? value : fail(what);

const textOrNull = (value: unknown, what: string) =>
  value === null || value === undefined ? null : text(value, what);

const time = (value: unknown, what: string) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fail(what);

const timeOrNull = (value: unknown, what: string) =>
  value === null || value === undefined ? null : time(value, what);

const flag = (value: unknown, what: string) => (typeof value === 'boolean' ? value : fail(what));

const list = (value: unknown, what: string) => (Array.isArray(value) ? value : fail(what));

const count = (value: unknown, what: string) =>
  Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fail(what);

const oneOf = <T extends string>(values: readonly T[], value: unknown, what: string): T =>
  values.find((candidate) => candidate === value) ?? fail(what);

const accessoryOrNull = (value: unknown, what: string) =>
  value === null || value === undefined ? null : oneOf(ACCESSORIES, value, what);

function toPerson(value: unknown): Person | null {
  if (value === null || value === undefined) return null;
  const row = body(value, 'person');
  return {
    id: text(row.id, 'person id'),
    name: textOrNull(row.name, 'person name'),
    avatarUrl: textOrNull(row.avatarUrl, 'person avatarUrl'),
  };
}

function toReply(value: unknown): Reply | null {
  if (value === null || value === undefined) return null;
  const row = body(value, 'reply');
  return { body: text(row.body, 'reply body'), createdAt: time(row.createdAt, 'reply createdAt') };
}

function toReview(value: unknown): Review {
  const row = body(value, 'review');
  return {
    id: text(row.id, 'review id'),
    face: oneOf(FACES, row.face, 'review face'),
    chips: list(row.chips, 'review chips').map((chip) => text(chip, 'review chip')),
    sentence: textOrNull(row.sentence, 'review sentence'),
    submittedAt: time(row.submittedAt, 'review submittedAt'),
    shownAt: timeOrNull(row.shownAt, 'review shownAt'),
    reply: toReply(row.reply),
  };
}

function toMyReview(value: unknown): MyReview | null {
  if (value === null || value === undefined) return null;
  return { ...toReview(value), editable: flag(body(value, 'mine').editable, 'mine editable') };
}

export function toReviewPair(value: unknown): ReviewPair {
  const row = body(value, 'review pair');
  const theirs = row.theirs;
  return {
    kind: oneOf(ITEM_KINDS, row.kind, 'pair kind'),
    itemId: text(row.itemId, 'pair itemId'),
    counterpart: toPerson(row.counterpart),
    role: oneOf(ROLES, row.role, 'pair role'),
    closesAt: time(row.closesAt, 'pair closesAt'),
    state: oneOf(PAIR_STATES, row.state, 'pair state'),
    theyReviewed: flag(row.theyReviewed, 'pair theyReviewed'),
    mine: toMyReview(row.mine),
    theirs: theirs === null || theirs === undefined ? null : toReview(theirs),
  };
}

export const toReviewPairs = (value: unknown) => list(value, 'review state').map(toReviewPair);

function toPending(value: unknown): PendingReview {
  const row = body(value, 'pending review');
  return {
    kind: oneOf(ITEM_KINDS, row.kind, 'pending kind'),
    itemId: text(row.itemId, 'pending itemId'),
    title: text(row.title, 'pending title'),
    counterpart: toPerson(row.counterpart),
    role: oneOf(ROLES, row.role, 'pending role'),
    closesAt: time(row.closesAt, 'pending closesAt'),
    theyReviewed: flag(row.theyReviewed, 'pending theyReviewed'),
  };
}

export const toPendingReviews = (value: unknown) => list(value, 'pending reviews').map(toPending);

export function toReplied(value: unknown): { reviewId: string; reply: Reply } {
  const row = body(value, 'reply answer');
  return {
    reviewId: text(row.reviewId, 'reply reviewId'),
    reply: { body: text(row.body, 'reply body'), createdAt: time(row.createdAt, 'reply time') },
  };
}

function toProfileReview(value: unknown): ProfileReview {
  const row = body(value, 'profile review');
  return {
    ...toReview(row),
    kind: oneOf(ITEM_KINDS, row.kind, 'profile review kind'),
    role: oneOf(ROLES, row.role, 'profile review role'),
    title: textOrNull(row.title, 'profile review title'),
    reviewer: toPerson(row.reviewer),
  };
}

function toPublicMascot(value: unknown): PublicMascot {
  const row = body(value, 'mascot');
  return {
    level: count(row.level, 'mascot level'),
    stickers: count(row.stickers, 'mascot stickers'),
    accessory: accessoryOrNull(row.accessory, 'mascot accessory'),
  };
}

function toFaces(value: unknown): FaceCounts {
  const row = body(value, 'faces');
  return {
    happy: count(row.happy, 'happy count'),
    okay: count(row.okay, 'okay count'),
    unhappy: count(row.unhappy, 'unhappy count'),
  };
}

const rate = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && parsed >= 0 && parsed <= 1 ? parsed : fail('completionRate');
};

export function toProfileCard(value: unknown): ProfileCard {
  const row = body(value, 'profile');
  return {
    id: text(row.id, 'profile id'),
    name: textOrNull(row.name, 'profile name'),
    avatarUrl: textOrNull(row.avatarUrl, 'profile avatarUrl'),
    joinedAt: time(row.joinedAt, 'profile joinedAt'),
    self: flag(row.self, 'profile self'),
    blockedByMe: flag(row.blockedByMe, 'profile blockedByMe'),
    tier: oneOf(TIERS, row.tier, 'profile tier'),
    helped: count(row.helped, 'profile helped'),
    settled: count(row.settled, 'profile settled'),
    completionRate: rate(row.completionRate),
    reviewCount: count(row.reviewCount, 'profile reviewCount'),
    faces: toFaces(row.faces),
    latestReviews: list(row.latestReviews, 'latest reviews').map(toProfileReview),
    mascot: toPublicMascot(row.mascot),
  };
}

export function toReviewPage(value: unknown): ReviewPage {
  const row = body(value, 'review page');
  const hasMore = flag(row.hasMore, 'review page hasMore');
  return {
    items: list(row.items, 'review page items').map(toProfileReview),
    hasMore,
    nextCursor: hasMore ? text(row.nextCursor, 'review page cursor') : null,
  };
}

export function toMyMascot(value: unknown): MyMascot {
  const row = body(value, 'my mascot');
  return {
    ...toPublicMascot(row),
    seenLevel: count(row.seenLevel, 'mascot seenLevel'),
    levelUp: flag(row.levelUp, 'mascot levelUp'),
    nextLevelAt: count(row.nextLevelAt, 'mascot nextLevelAt'),
    chosenAccessory: accessoryOrNull(row.chosenAccessory, 'mascot chosenAccessory'),
    unlocked: list(row.unlocked, 'mascot unlocked').map((item) =>
      oneOf(ACCESSORIES, item, 'unlocked accessory'),
    ),
  };
}

function toNoShow(value: unknown): TierDropNoShow {
  const row = body(value, 'no-show');
  return {
    at: time(row.at, 'no-show at'),
    kind: oneOf(ITEM_KINDS, row.kind, 'no-show kind'),
    title: textOrNull(row.title, 'no-show title'),
  };
}

export function toTierDrop(value: unknown): TierDrop | null {
  if (value === null || value === undefined) return null;
  const row = body(value, 'tier drop');
  const detail = body(row.detail, 'tier drop detail');
  const regain = body(detail.toRegain, 'tier drop toRegain');
  return {
    id: count(row.id, 'tier drop id'),
    from: oneOf(TIERS, row.from, 'tier drop from'),
    to: oneOf(TIERS, row.to, 'tier drop to'),
    droppedAt: time(row.droppedAt, 'tier drop droppedAt'),
    noShows: list(detail.noShows, 'tier drop noShows').map(toNoShow),
    noShowCount: count(detail.noShowCount, 'noShowCount'),
    negativeReviews: count(detail.negativeReviews, 'negativeReviews'),
    settled: count(detail.settled, 'tier drop settled'),
    people: count(detail.people, 'tier drop people'),
    toRegain: {
      tier: oneOf(TIERS, regain.tier, 'toRegain tier'),
      settled: count(regain.settled, 'toRegain settled'),
      newPeople: count(regain.newPeople, 'toRegain newPeople'),
      goodReviews: count(regain.goodReviews, 'toRegain goodReviews'),
    },
  };
}
