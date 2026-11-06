import {
  COIN_REASONS,
  ITEM_KINDS,
  type CoinBalance,
  type CoinRow,
  type FeedResult,
  type FeedStatus,
  type HistoryPage,
  type Invite,
  type InvitedFriend,
  type Person,
} from './types';

const fail = (what: string): never => {
  throw new Error(`coins: unexpected ${what}`);
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

const integer = (value: unknown, what: string) =>
  Number.isInteger(value) ? Number(value) : fail(what);

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const INVITE_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

export const normalizeInviteCode = (typed: string) => typed.replace(/[\s-]/g, '').toUpperCase();

export const inviteCodeShaped = (typed: string) => INVITE_CODE.test(normalizeInviteCode(typed));

export function toBalance(value: unknown): CoinBalance {
  const row = body(value, 'balance');
  return {
    coins: integer(row.coins, 'balance coins'),
    freePostsLeft: count(row.freePostsLeft, 'freePostsLeft'),
    freePostsPerMonth: count(row.freePostsPerMonth, 'freePostsPerMonth'),
    nextFreeAt: time(row.nextFreeAt, 'nextFreeAt'),
  };
}

function toRow(value: unknown): CoinRow {
  const row = body(value, 'coin row');
  const item = row.item === null || row.item === undefined ? null : body(row.item, 'coin item');
  const month = text(row.month, 'coin month');
  if (!MONTH.test(month)) fail('coin month');
  return {
    id: count(row.id, 'coin id'),
    reason: COIN_REASONS.find((reason) => reason === row.reason) ?? 'other',
    delta: integer(row.delta, 'coin delta'),
    at: time(row.at, 'coin at'),
    month,
    item: item
      ? {
          kind: ITEM_KINDS.find((kind) => kind === item.kind) ?? fail('coin item kind'),
          id: text(item.id, 'coin item id'),
          title: textOrNull(item.title, 'coin item title'),
        }
      : null,
  };
}

export function toHistoryPage(value: unknown): HistoryPage {
  const row = body(value, 'history page');
  const hasMore = flag(row.hasMore, 'history hasMore');
  return {
    items: list(row.items, 'history items').map(toRow),
    hasMore,
    nextCursor: hasMore ? count(row.nextCursor, 'history cursor') : null,
  };
}

export function toFeedStatus(value: unknown): FeedStatus {
  const row = body(value, 'feed status');
  return {
    fedThisWeek: flag(row.fedThisWeek, 'fedThisWeek'),
    nextWeekAt: time(row.nextWeekAt, 'nextWeekAt'),
    coins: integer(row.coins, 'feed coins'),
  };
}

export function toFeedResult(value: unknown): FeedResult {
  const row = body(value, 'feed result');
  const status = row.status === 'fed' || row.status === 'already_fed' ? row.status : fail('feed');
  return { ...toFeedStatus(row), status };
}

function toPerson(value: unknown): Person | null {
  if (value === null || value === undefined) return null;
  const row = body(value, 'person');
  return {
    id: text(row.id, 'person id'),
    name: textOrNull(row.name, 'person name'),
    avatarUrl: textOrNull(row.avatarUrl, 'person avatarUrl'),
  };
}

function toFriend(value: unknown): InvitedFriend {
  const row = body(value, 'invited friend');
  return {
    person: toPerson(row.person),
    redeemedAt: time(row.redeemedAt, 'redeemedAt'),
    rewardedAt: timeOrNull(row.rewardedAt, 'rewardedAt'),
  };
}

export function toInvite(value: unknown): Invite {
  const row = body(value, 'invite');
  const code = textOrNull(row.code, 'invite code');
  if (code !== null && !INVITE_CODE.test(code)) fail('invite code');
  const redeemed =
    row.redeemed === null || row.redeemed === undefined
      ? null
      : body(row.redeemed, 'invite redeemed');
  return {
    code,
    reward: count(row.reward, 'invite reward'),
    redeemed: redeemed
      ? {
          code: text(redeemed.code, 'redeemed code'),
          inviter: toPerson(redeemed.inviter),
          rewarded: flag(redeemed.rewarded, 'redeemed rewarded'),
        }
      : null,
    canRedeem: flag(row.canRedeem, 'invite canRedeem'),
    invited: list(row.invited, 'invite invited').map(toFriend),
  };
}
