import {
  nextMorning,
  STATUS_DATA,
  WORST_HELPER,
  WORST_POSTER,
  WORST_REASON,
  WORST_REWARD_SEN,
  WORST_TITLE,
  type StatusData,
} from '../status/fixtureStatusWorst';
import type { LiveBountyService, LiveRow, SeenCard } from './types';

export const LIVE_FIXTURE_ROWS = [
  'posterOpen',
  'posterApplicants',
  'posterAssigned',
  'posterLate',
  'posterEnRoute',
  'posterDone',
  'posterDisputed',
  'posterExpiredFree',
  'posterExpiredCoin',
  'helperAssigned',
  'helperLate',
  'helperEnRoute',
  'helperDone',
  'helperDisputed',
  'applicantWaiting',
  'applicantNotSelected',
] as const;
export type LiveFixtureRow = (typeof LIVE_FIXTURE_ROWS)[number];

export type SeenCall = { bountyId: string; card: SeenCard };

export type FixtureLiveOptions = {
  rows: readonly LiveFixtureRow[];
  failFirstLoad: boolean;
  data?: StatusData;
  now: () => Date;
  onSeen?: (calls: SeenCall[]) => void;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function fixtureLiveRowIds(selection: string | undefined): LiveFixtureRow[] {
  if (!selection || selection === 'none') return [];
  if (selection === 'all') return [...LIVE_FIXTURE_ROWS];
  const chosen = selection.split(',').map((part) => part.trim());
  return LIVE_FIXTURE_ROWS.filter((row) => chosen.includes(row));
}

export function fixtureLiveOptions(
  argument: (name: string) => string | undefined,
  now: () => Date = () => new Date(),
): FixtureLiveOptions {
  return {
    rows: fixtureLiveRowIds(argument('uiVerifyBountyLive')),
    failFirstLoad: argument('uiVerifyBountyLiveFail') === '1',
    data: STATUS_DATA.find((value) => value === argument('uiVerifyBountyLiveData')) ?? 'demo',
    now,
  };
}

export const fixtureLiveBountyId = (row: LiveFixtureRow) => `fixture-live-${row}`;

const BASE: Omit<LiveRow, 'bountyId' | 'role' | 'kind' | 'status'> = {
  title: '帮取快递',
  category: 'pickup',
  rewardSen: 1500,
  action: null,
  card: null,
  counterpartName: '阿杰',
  applicantCount: null,
  startsAt: null,
  startLate: false,
  etaAt: null,
  previousEtaAt: null,
  autoConfirmAt: null,
  issueReason: null,
  refund: null,
};

const REASON = '快递盒子压坏了，里面的杯子碎了一个';

function worstRow(row: LiveRow, now: Date): LiveRow {
  const later = (at: string | null) =>
    at ? new Date(nextMorning(now.getTime())).toISOString() : null;
  const name = row.role === 'poster' ? WORST_HELPER.name : WORST_POSTER.name;
  return {
    ...row,
    title: WORST_TITLE,
    rewardSen: WORST_REWARD_SEN,
    counterpartName: row.counterpartName ? name : null,
    startsAt: row.startLate ? row.startsAt : later(row.startsAt),
    etaAt: later(row.etaAt),
    issueReason: row.issueReason ? WORST_REASON : null,
  };
}

function fixtureData(row: LiveRow, data: StatusData, now: Date): LiveRow {
  if (data === 'worst') return worstRow(row, now);
  if (data === 'unnamed') return { ...row, counterpartName: null };
  return row;
}

function fixtureRow(row: LiveFixtureRow, now: Date): LiveRow {
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  const bountyId = fixtureLiveBountyId(row);
  const poster = { ...BASE, bountyId, role: 'poster' as const };
  const helper = { ...BASE, bountyId, role: 'helper' as const, counterpartName: '小林' };
  const applicant = { ...BASE, bountyId, role: 'applicant' as const, counterpartName: '小林' };
  switch (row) {
    case 'posterOpen':
      return {
        ...poster,
        kind: 'bountyInProgress',
        status: 'open',
        counterpartName: null,
        applicantCount: 0,
      };
    case 'posterApplicants':
      return {
        ...poster,
        kind: 'bountyAction',
        action: 'choose',
        status: 'open',
        counterpartName: null,
        applicantCount: 3,
      };
    case 'posterAssigned':
      return {
        ...poster,
        kind: 'bountyInProgress',
        status: 'assigned',
        startsAt: at(40 * MINUTE_MS),
      };
    case 'posterLate':
      return {
        ...poster,
        kind: 'bountyInProgress',
        status: 'assigned',
        startsAt: at(-10 * MINUTE_MS),
        startLate: true,
      };
    case 'posterEnRoute':
      return {
        ...poster,
        kind: 'bountyInProgress',
        status: 'en_route',
        etaAt: at(15 * MINUTE_MS),
        previousEtaAt: at(5 * MINUTE_MS),
      };
    case 'posterDone':
      return {
        ...poster,
        kind: 'bountyAction',
        action: 'confirm',
        status: 'done',
        autoConfirmAt: at(47 * HOUR_MS),
      };
    case 'posterDisputed':
      return { ...poster, kind: 'bountyInProgress', status: 'disputed', issueReason: REASON };
    case 'posterExpiredFree':
      return {
        ...poster,
        kind: 'oneTime',
        card: 'expired',
        status: 'closed',
        counterpartName: null,
        refund: 'free',
      };
    case 'posterExpiredCoin':
      return {
        ...poster,
        kind: 'oneTime',
        card: 'expired',
        status: 'closed',
        counterpartName: null,
        refund: 'coin',
      };
    case 'helperAssigned':
      return {
        ...helper,
        kind: 'bountyAction',
        action: 'start',
        status: 'assigned',
        startsAt: at(40 * MINUTE_MS),
      };
    case 'helperLate':
      return {
        ...helper,
        kind: 'bountyAction',
        action: 'start',
        status: 'assigned',
        startsAt: at(-10 * MINUTE_MS),
        startLate: true,
      };
    case 'helperEnRoute':
      return { ...helper, kind: 'bountyInProgress', status: 'en_route', etaAt: at(15 * MINUTE_MS) };
    case 'helperDone':
      return {
        ...helper,
        kind: 'bountyInProgress',
        status: 'done',
        autoConfirmAt: at(47 * HOUR_MS),
      };
    case 'helperDisputed':
      return {
        ...helper,
        kind: 'bountyAction',
        action: 'resolveIssue',
        status: 'disputed',
        issueReason: REASON,
      };
    case 'applicantWaiting':
      return { ...applicant, kind: 'bountyInProgress', status: 'open' };
    case 'applicantNotSelected':
      return { ...applicant, kind: 'oneTime', card: 'not_selected', status: 'assigned' };
  }
}

export function createFixtureLiveService(options: FixtureLiveOptions): LiveBountyService {
  let loads = 0;
  const calls: SeenCall[] = [];
  const seen = new Set<string>();
  return {
    async list() {
      loads += 1;
      if (options.failFirstLoad && loads === 1) throw new Error('fixture live items failed');
      const now = options.now();
      return options.rows
        .map((row) => fixtureData(fixtureRow(row, now), options.data ?? 'demo', now))
        .filter((row) => !(row.card && seen.has(`${row.bountyId}:${row.card}`)));
    },
    async markSeen(bountyId, card) {
      calls.push({ bountyId, card });
      seen.add(`${bountyId}:${card}`);
      options.onSeen?.([...calls]);
      return true;
    },
  };
}
