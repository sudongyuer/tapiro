import { inviteCodeShaped, normalizeInviteCode } from './parse';
import {
  HISTORY_PAGE_SIZE,
  type CoinReason,
  type CoinRow,
  type CoinsService,
  type FeedStatus,
  type Invite,
} from './types';

export const COINS_VARIANTS = ['many', 'one', 'empty', 'failed', 'worst'] as const;
export type CoinsVariant = (typeof COINS_VARIANTS)[number];

export const coinsVariant = (value: string | undefined): CoinsVariant =>
  COINS_VARIANTS.find((variant) => variant === value) ?? 'many';

export const COINS_FAIL_POINTS = [
  'balance',
  'history',
  'feedStatus',
  'feed',
  'invite',
  'redeem',
  'historyAgain',
  'historyMore',
  'inviteAgain',
  'redeemTooLate',
] as const;
export type CoinsFailPoint = (typeof COINS_FAIL_POINTS)[number];

const FIRST_CALLS: readonly CoinsFailPoint[] = [
  'balance',
  'history',
  'feedStatus',
  'feed',
  'invite',
  'redeem',
];

export function coinsFailPoints(value: string | undefined): CoinsFailPoint[] {
  const parts = (value ?? '').split(',').map((part) => part.trim());
  return COINS_FAIL_POINTS.filter((point) => parts.includes(point));
}

export const FIXTURE_FRIEND_CODE = '7KQ3XP';
export const FIXTURE_MY_CODE = 'M8WQ4K';

const LONG_TITLE =
  '帮忙从 Sunway Pyramid 带一份椰浆饭到 Sunway Geo Residences 的大堂，顺便买两杯拉茶';

function rows(variant: CoinsVariant, now: Date): CoinRow[] {
  if (variant === 'empty') return [];
  const month = (offset: number) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    return date.toISOString().slice(0, 7);
  };
  const day = (offset: number, n: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, n, 4)).toISOString();
  const row = (
    id: number,
    reason: CoinReason,
    delta: number,
    offset: number,
    n: number,
    title: string | null = null,
  ): CoinRow => ({
    id,
    reason,
    delta,
    at: day(offset, n),
    month: month(offset),
    item: title ? { kind: 'bounty', id: `fixture-coin-item-${id}`, title } : null,
  });
  const base = [
    row(9, 'weekly_feed', 1, 0, 3),
    row(8, 'post_spend', -1, 0, 2, variant === 'worst' ? LONG_TITLE : '帮取快递'),
    row(7, 'post_refund', 1, 0, 1, '帮取快递'),
    row(6, 'invite_invitee', 3, 1, 20),
    row(5, 'help_settled', 1, 1, 12, '帮忙排队买奶茶'),
    row(4, 'onboarding_first_help', 1, 1, 10),
    row(3, 'onboarding_first_post', 1, 1, 9),
    row(2, 'onboarding_payee_method', 1, 1, 8),
    row(1, 'new_user', 5, 1, 8),
  ];
  if (variant === 'one') return [row(1, 'new_user', 5, 0, 1)];
  if (variant !== 'worst') return base;
  const extra = Array.from({ length: 120 }, (_, index) =>
    row(1000 - index, 'help_settled', 1, 2 + Math.floor(index / 10), 1 + (index % 10), LONG_TITLE),
  );
  return [...base.map((entry) => ({ ...entry, id: entry.id + 2000 })), ...extra];
}

export function createFixtureCoinsService({
  variant,
  failFirst = [],
  delayMs = 0,
  now = () => new Date(),
  fedAtStart,
  onCall,
}: {
  variant: CoinsVariant;
  fedAtStart?: boolean;
  failFirst?: readonly CoinsFailPoint[];
  delayMs?: number;
  now?: () => Date;
  onCall?: (name: string, args: unknown) => void;
}): CoinsService {
  const failing = new Set<CoinsFailPoint>(variant === 'failed' ? FIRST_CALLS : failFirst);
  let firstPages = 0;
  let inviteReads = 0;
  const data = variant === 'failed' ? 'many' : variant;
  const ledger = rows(data, now());
  let coins = ledger.reduce((sum, row) => sum + row.delta, 0) + (data === 'worst' ? 1105 : 0);
  let fed = fedAtStart ?? data === 'one';
  let nextId = 5000;
  let invite: Invite = {
    code: FIXTURE_MY_CODE,
    reward: 3,
    redeemed: null,
    canRedeem: data !== 'many',
    invited:
      data === 'empty' || data === 'one'
        ? []
        : [
            {
              person: { id: 'fixture-person-aming', name: '阿明', avatarUrl: null },
              redeemedAt: now().toISOString(),
              rewardedAt: now().toISOString(),
            },
            {
              person: {
                id: 'fixture-person-siti',
                name: 'Siti Nurhaliza binti Ahmad Zulkifli Rahman',
                avatarUrl: null,
              },
              redeemedAt: now().toISOString(),
              rewardedAt: null,
            },
          ],
  };

  async function step(point: CoinsFailPoint, name: string, args: unknown = null) {
    onCall?.(name, args);
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (failing.delete(point)) throw new Error(`fixture ${point} failed`);
  }

  const feedStatus = (): FeedStatus => {
    const today = now();
    const daysToMonday = (8 - today.getUTCDay()) % 7 || 7;
    const next = new Date(today.getTime() + daysToMonday * 86_400_000);
    next.setUTCHours(16, 0, 0, 0);
    return { fedThisWeek: fed, nextWeekAt: next.toISOString(), coins };
  };

  return {
    async balance() {
      await step('balance', 'balance');
      const next = new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth() + 1, 1));
      return {
        coins,
        freePostsLeft: data === 'empty' ? 3 : data === 'worst' ? 0 : 2,
        freePostsPerMonth: 3,
        nextFreeAt: next.toISOString(),
      };
    },
    async history(before) {
      const again = before === null && firstPages++ > 0 && failing.has('historyAgain');
      const point = before !== null ? 'historyMore' : again ? 'historyAgain' : 'history';
      await step(point, 'history', { before });
      const from = before === null ? 0 : ledger.findIndex((row) => row.id === before) + 1;
      const items = ledger.slice(from, from + HISTORY_PAGE_SIZE);
      const hasMore = ledger.length > from + HISTORY_PAGE_SIZE;
      return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
    },
    async feedStatus() {
      await step('feedStatus', 'feedStatus');
      return feedStatus();
    },
    async feed() {
      await step('feed', 'feed');
      if (fed) return { status: 'already_fed', ...feedStatus() };
      fed = true;
      coins += 1;
      const at = now();
      ledger.unshift({
        id: nextId++,
        reason: 'weekly_feed',
        delta: 1,
        at: at.toISOString(),
        month: at.toISOString().slice(0, 7),
        item: null,
      });
      return { status: 'fed', ...feedStatus() };
    },
    async invite() {
      const again = inviteReads++ > 0 && failing.has('inviteAgain');
      await step(again ? 'inviteAgain' : 'invite', 'invite');
      return invite;
    },
    async redeem(typed) {
      try {
        await step('redeem', 'redeem', { typed });
      } catch {
        return { ok: false, failure: 'failed' };
      }
      if (!inviteCodeShaped(typed)) return { ok: false, failure: 'malformed' };
      if (failing.delete('redeemTooLate')) {
        invite = { ...invite, canRedeem: false };
        return { ok: false, failure: 'tooLate' };
      }
      const code = normalizeInviteCode(typed);
      if (invite.redeemed) {
        return invite.redeemed.code === code
          ? { ok: true, invite }
          : { ok: false, failure: 'alreadyRedeemed' };
      }
      if (code === FIXTURE_MY_CODE) return { ok: false, failure: 'ownCode' };
      if (code !== FIXTURE_FRIEND_CODE) return { ok: false, failure: 'notFound' };
      if (!invite.canRedeem) return { ok: false, failure: 'tooLate' };
      invite = {
        ...invite,
        canRedeem: false,
        redeemed: {
          code,
          inviter: { id: 'fixture-person-mei', name: 'Mei', avatarUrl: null },
          rewarded: false,
        },
      };
      return { ok: true, invite };
    },
  };
}
