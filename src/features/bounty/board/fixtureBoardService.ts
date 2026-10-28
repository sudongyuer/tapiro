import type { FixtureVariant } from '@/lib/fixtureVariant';
import type { Point } from '@/lib/location/types';

import { FIXTURE_USER_ID } from '../post/fixtureDrafts';
import { AXIS_RANGE_M } from './axis';
import { PAGE_SIZE } from './boardService';
import {
  BOARDS,
  BUSY_WINDOW,
  FIXTURE_BOARDS,
  type BoardFixture,
  type FixtureBounty,
} from './fixtureBoardData';
import { distanceM } from './originStore';
import {
  originPoint,
  type BoardFilter,
  type BoardRow,
  type BoardService,
  type BountyDetail,
  type Person,
} from './types';

export const BOARD_FAILURES = ['none', 'first', 'refresh', 'page'] as const;
export const APPLY_MODES = ['ok', 'failOnce', 'taken', 'closed', 'gone'] as const;
export const DETAIL_MODES = ['ok', 'failOnce', 'gone', 'notSelected', 'selected'] as const;
export const DEFAULT_DETAIL_ID = 'fixture-bounty-01';
export const FIXTURE_ADDRESS = 'A 座 12-03';
export const FIXTURE_ME: Person = { id: FIXTURE_USER_ID, name: '林小貘', tier: 'reliable' };
const OUTCOME_NOTE = '我下午三点前都在宿舍，可以顺路帮你拿上来。';

export type BoardFailure = (typeof BOARD_FAILURES)[number];
export type ApplyMode = (typeof APPLY_MODES)[number];
export type DetailMode = (typeof DETAIL_MODES)[number];

export type FixtureBoardOptions = {
  board: BoardFixture;
  fail: BoardFailure;
  apply: ApplyMode;
  detail: DetailMode;
  detailId: string;
  variant: FixtureVariant;
  now: () => Date;
  writeDelayMs?: number;
  isBlocked?: (posterId: string) => boolean;
  posterView?: (id: string) => { helper: Person | null } | null;
};

function pick<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.find((candidate) => candidate === value) ?? fallback;
}

export function fixtureBoardOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
  now: () => Date = () => new Date(),
): FixtureBoardOptions {
  return {
    board: pick(BOARDS, argument('uiVerifyBoard'), 'full'),
    fail: pick(BOARD_FAILURES, argument('uiVerifyBoardFail'), 'none'),
    apply: pick(APPLY_MODES, argument('uiVerifyApply'), 'ok'),
    detail: pick(DETAIL_MODES, argument('uiVerifyDetail'), 'ok'),
    detailId: argument('uiVerifyDetailId') ?? DEFAULT_DETAIL_ID,
    variant,
    now,
  };
}

const MINUTE_MS = 60_000;
const URGENT_MS = 3 * 60 * MINUTE_MS;
const LISTED_DAYS_MS = 7 * 24 * 60 * MINUTE_MS;

type FixtureCursor = {
  kind: 'fixture';
  id: string;
  latitude: number | null;
  longitude: number | null;
  filter: BoardFilter;
};

const rounded = (from: Point | null, to: Point | null) =>
  from && to ? Math.max(100, Math.round(distanceM(from, to) / 100) * 100) : null;

const cleanNote = (note: string | null) => note?.replace(/^ +| +$/g, '') || null;

const pause = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

const mismatch = () => Object.assign(new Error('board_cursor_mismatch'), { code: '22023' });

export function createFixtureBoardService(options: FixtureBoardOptions): BoardService {
  const base = options.now().getTime();
  const at = (minutes: number) => new Date(base + minutes * MINUTE_MS).toISOString();
  const all = FIXTURE_BOARDS[options.board];
  const hidden = (item: FixtureBounty) => options.isBlocked?.(item.poster.id) ?? false;
  const visible = () => all.filter((item) => !hidden(item));
  const applications = new Map<string, { status: 'pending' | 'withdrawn'; note: string | null }>(
    all.filter((item) => item.applied).map((item) => [item.id, { status: 'pending', note: null }]),
  );
  let firstLoads = 0;
  let pageFailures = options.fail === 'page' ? 1 : 0;
  let applyFailures = options.apply === 'failOnce' ? 1 : 0;
  let detailFailures = options.detail === 'failOnce' ? 1 : 0;

  const slot = (item: FixtureBounty) =>
    item.window
      ? [
          base + item.window.startInMinutes * MINUTE_MS,
          base + (item.window.startInMinutes + item.window.minutes) * MINUTE_MS,
        ]
      : null;
  const busy = [
    base + BUSY_WINDOW.startInMinutes * MINUTE_MS,
    base + (BUSY_WINDOW.startInMinutes + BUSY_WINDOW.minutes) * MINUTE_MS,
  ];

  function deadline(item: FixtureBounty) {
    return item.deadlineInMinutes === null ? null : base + item.deadlineInMinutes * MINUTE_MS;
  }

  function urgent(item: FixtureBounty) {
    const due = deadline(item);
    const now = options.now().getTime();
    return due !== null && due > now && due <= now + URGENT_MS;
  }

  function matches(item: FixtureBounty, filter: BoardFilter) {
    if (filter === 'urgent') return urgent(item);
    if (filter === 'fits_my_time') {
      const range = slot(item);
      return range === null || range[1] <= busy[0] || range[0] >= busy[1];
    }
    return true;
  }

  function toRow(item: FixtureBounty, here: Point | null): BoardRow {
    const range = item.window;
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      rewardSen: item.rewardSen,
      placeLabel: item.placeLabel,
      stickerPath: null,
      startsAt: range ? at(range.startInMinutes) : null,
      endsAt: range ? at(range.startInMinutes + range.minutes) : null,
      deadlineAt: item.deadlineInMinutes === null ? null : at(item.deadlineInMinutes),
      urgent: urgent(item),
      distanceM: rounded(here, item.point),
      appliedByMe: applications.get(item.id)?.status === 'pending',
      createdAt: at(-item.createdMinutesAgo),
      poster: item.poster,
    };
  }

  function ordered(here: Point | null, filter: BoardFilter) {
    const byRecency = (a: FixtureBounty, b: FixtureBounty) =>
      a.createdMinutesAgo - b.createdMinutesAgo || b.id.localeCompare(a.id);
    const listed = visible().filter((item) => matches(item, filter));
    if (!here) return [...listed].sort(byRecency);
    const located = listed
      .flatMap((item) => (item.point ? [{ item, distance: distanceM(here, item.point) }] : []))
      .sort((a, b) => a.distance - b.distance || a.item.id.localeCompare(b.item.id))
      .map(({ item }) => item);
    const unlocated = listed.filter((item) => item.point === null).sort(byRecency);
    return [...located, ...unlocated];
  }

  function outcome(item: FixtureBounty) {
    if (item.id !== options.detailId) return null;
    return options.detail === 'selected' || options.detail === 'notSelected'
      ? options.detail
      : null;
  }

  function party(item: FixtureBounty, application: BountyDetail['myApplication']) {
    const shown = outcome(item);
    const note = application?.note ?? OUTCOME_NOTE;
    if (shown === 'selected') {
      return {
        status: 'assigned',
        viewerRole: 'helper',
        address: FIXTURE_ADDRESS,
        helper: FIXTURE_ME,
        myApplication: { status: 'selected', note },
      } as const;
    }
    if (shown === 'notSelected') {
      return {
        status: 'assigned',
        viewerRole: 'applicant',
        address: null,
        helper: null,
        myApplication: { status: 'not_selected', note },
      } as const;
    }
    const poster = options.posterView?.(item.id) ?? null;
    if (poster) {
      return {
        status: poster.helper ? 'assigned' : 'open',
        viewerRole: 'poster',
        address: FIXTURE_ADDRESS,
        helper: poster.helper,
        myApplication: null,
      } as const;
    }
    return {
      status: 'open',
      viewerRole: application ? 'applicant' : 'viewer',
      address: null,
      helper: null,
      myApplication: application,
    } as const;
  }

  function detailOf(item: FixtureBounty, here: Point | null): BountyDetail {
    const row = toRow(item, here);
    const stored = applications.get(item.id);
    const roles = party(item, stored ? { ...stored } : null);
    return {
      id: row.id,
      title: row.title,
      description: item.description,
      category: row.category,
      rewardSen: row.rewardSen,
      status: roles.status,
      viewerRole: roles.viewerRole,
      place: row.placeLabel === null ? null : { label: row.placeLabel },
      distanceM: row.distanceM,
      address: roles.address,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      deadlineAt: row.deadlineAt,
      expiresAt: new Date(
        Math.min(
          deadline(item) ?? Infinity,
          base + LISTED_DAYS_MS - item.createdMinutesAgo * MINUTE_MS,
        ),
      ).toISOString(),
      poster: row.poster,
      helper: roles.helper,
      myApplication: roles.myApplication,
    };
  }

  return {
    async page(origin, filter, after) {
      const here = originPoint(origin);
      if (after === null) {
        firstLoads += 1;
        const failing =
          (options.fail === 'first' && firstLoads === 1) ||
          (options.fail === 'refresh' && firstLoads === 2);
        if (failing) throw new TypeError('Network request failed');
      } else if (pageFailures > 0) {
        pageFailures -= 1;
        throw new TypeError('Network request failed');
      }
      const list = ordered(here, filter);
      let start = 0;
      if (after !== null) {
        const cursor = after as FixtureCursor;
        if (
          cursor.filter !== filter ||
          cursor.latitude !== (here?.latitude ?? null) ||
          cursor.longitude !== (here?.longitude ?? null)
        ) {
          throw mismatch();
        }
        const index = list.findIndex((item) => item.id === cursor.id);
        if (index < 0) throw mismatch();
        start = index + 1;
      }
      const slice = list.slice(start, start + PAGE_SIZE);
      const last = slice[slice.length - 1];
      const next: FixtureCursor | null =
        start + PAGE_SIZE < list.length && last
          ? {
              kind: 'fixture',
              id: last.id,
              latitude: here?.latitude ?? null,
              longitude: here?.longitude ?? null,
              filter,
            }
          : null;
      const items = slice.map((item) => toRow(item, here));
      if (after !== null) return { items, next };
      if (!here) return { items, next, total: list.length };
      const beyondTotal = list.filter(
        (item) => (rounded(here, item.point) ?? 0) > AXIS_RANGE_M,
      ).length;
      return { items, next, total: list.length, beyondTotal };
    },
    async detail(id, point) {
      if (detailFailures > 0) {
        detailFailures -= 1;
        throw new TypeError('Network request failed');
      }
      const item = visible().find((candidate) => candidate.id === id);
      return item && options.detail !== 'gone' ? detailOf(item, point) : 'gone';
    },
    async hasPayeeMethod() {
      return options.variant !== 'empty';
    },
    async apply(id, note) {
      await pause(options.writeDelayMs ?? 0);
      if (applyFailures > 0) {
        applyFailures -= 1;
        return { ok: false, reason: 'failed' };
      }
      if (!visible().some((item) => item.id === id) || options.apply === 'gone') {
        return { ok: false, reason: 'gone' };
      }
      if (options.apply === 'closed' || options.apply === 'taken') {
        return { ok: false, reason: options.apply };
      }
      const current = applications.get(id);
      if (current?.status === 'pending') return { ok: true, note: current.note };
      if (options.variant === 'empty') return { ok: false, reason: 'noPayee' };
      const cleaned = cleanNote(note);
      applications.set(id, { status: 'pending', note: cleaned });
      return { ok: true, note: cleaned };
    },
    async withdraw(id) {
      await pause(options.writeDelayMs ?? 0);
      const current = applications.get(id);
      if (!current) return { ok: false, reason: 'notPending' };
      applications.set(id, { ...current, status: 'withdrawn' });
      return { ok: true };
    },
  };
}
