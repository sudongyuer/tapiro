import type { FixtureVariant } from '@/lib/fixtureVariant';

import { RideDetailMissing } from './detailService';
import { activeMembers } from './detailModel';
import {
  DETAIL_SCENES,
  FIXTURE_VIEWER,
  fixtureRideDetail,
  type DetailScene,
} from './fixtureDetails';
import type { RideDetail, RideDetailService, RideFailure, RideMember, RideWrite } from './types';

export const DETAIL_FAILS = ['none', 'first', 'refresh', 'write'] as const;

export type FixtureDetailOptions = {
  scene: DetailScene | null;
  fail: (typeof DETAIL_FAILS)[number];
  variant: FixtureVariant;
  now: () => number;
  delayMs: number;
};

export function fixtureDetailOptions(
  argument: (name: string) => string | undefined,
  variant: FixtureVariant,
): FixtureDetailOptions {
  const scene = DETAIL_SCENES.find((candidate) => candidate === argument('uiVerifyRideDetail'));
  return {
    scene: scene ?? null,
    fail: DETAIL_FAILS.find((fail) => fail === argument('uiVerifyRideDetailFail')) ?? 'none',
    variant,
    now: () => Date.now(),
    delayMs: Number(argument('uiVerifyRideDetailDelayMs')) || 600,
  };
}

const LIST_SCENES: Readonly<Record<string, DetailScene>> = {
  'ride-airport': 'viewer',
  'ride-mall': 'viewerMall',
  'ride-requests': 'organiser',
  'ride-leaving': 'meetup',
  'ride-full': 'viewer',
};

const iso = (time: number) => new Date(time).toISOString();

export function createFixtureRideDetailService(
  options: FixtureDetailOptions,
  onCall: (name: string, args: unknown) => void = () => {},
): RideDetailService {
  const rides = new Map<string, RideDetail>();
  let loads = 0;
  let writeFailed = false;
  const wait = () => new Promise((resolve) => setTimeout(resolve, options.delayMs));

  function current(id: string) {
    const known = rides.get(id);
    if (known) return known;
    const scene = options.scene ?? LIST_SCENES[id];
    if (!scene) throw new RideDetailMissing(id);
    const detail = { ...fixtureRideDetail(scene, options.now(), options.variant), id };
    rides.set(id, detail.id === 'ride-full' ? { ...detail, taken: detail.seats } : detail);
    return rides.get(id) as RideDetail;
  }

  const update = (id: string, patch: (ride: RideDetail) => Partial<RideDetail>) => {
    const ride = current(id);
    rides.set(id, { ...ride, ...patch(ride) });
  };

  const mapMembers = (ride: RideDetail, change: (member: RideMember) => RideMember) =>
    ride.members?.map(change) ?? null;

  const mine =
    (change: Partial<Pick<RideMember, 'arrivedAt' | 'lateUntil' | 'lateAt'>>) =>
    (ride: RideDetail): Partial<RideDetail> => ({
      ...(change.arrivedAt !== undefined ? { arrivedAt: change.arrivedAt } : {}),
      ...(change.lateUntil !== undefined ? { lateUntil: change.lateUntil } : {}),
      members: mapMembers(ride, (m) => (m.id === FIXTURE_VIEWER ? { ...m, ...change } : m)),
    });

  async function write(name: string, args: unknown, apply: () => void): Promise<RideWrite> {
    onCall(name, args);
    await wait();
    if (options.fail === 'write' && !writeFailed) {
      writeFailed = true;
      return { ok: false, reason: 'failed' satisfies RideFailure };
    }
    apply();
    return { ok: true, value: null };
  }

  return {
    async load(id) {
      loads += 1;
      await wait();
      if ((options.fail === 'first' && loads === 1) || (options.fail === 'refresh' && loads > 1)) {
        throw new Error('fixture: ride detail failed');
      }
      return current(id);
    },
    request: (id, note) =>
      write('request', { id, note }, () =>
        update(id, () => ({ role: 'applicant', myStatus: 'requested', myNote: note })),
      ),
    withdraw: (id) =>
      write('withdraw', { id }, () =>
        update(id, () => ({ role: 'viewer', myStatus: 'withdrawn', myNote: null })),
      ),
    decide: (id, member, approve) =>
      write('decide', { id, member, approve }, () =>
        update(id, (ride) => {
          const request = ride.requests?.find((r) => r.id === member);
          const requests = ride.requests?.filter((r) => r.id !== member) ?? null;
          if (!approve || !request) return { requests };
          const joined: RideMember = {
            id: request.id,
            name: request.name,
            tier: request.tier,
            status: 'accepted',
            organiser: false,
            arrivedAt: null,
            lateUntil: null,
            lateAt: null,
            joinedAt: iso(options.now()),
          };
          const taken = ride.taken + 1;
          return {
            requests,
            taken,
            fullAt: taken >= ride.seats ? iso(options.now()) : ride.fullAt,
            members: [...(ride.members ?? []), joined],
          };
        }),
      ),
    async leavePreview(id) {
      await wait();
      const ride = current(id);
      const inside = Date.parse(ride.revisedAt ?? ride.departAt) - options.now() <= 15 * 60_000;
      return { ok: true, value: { noShow: inside, waiverAvailable: inside ? true : null } };
    },
    leave: (id) =>
      write('leave', { id }, () =>
        update(id, (ride) => ({
          role: 'viewer',
          myStatus: 'left',
          taken: ride.taken - 1,
          members: null,
          details: null,
        })),
      ),
    async cancelPreview(id) {
      await wait();
      const ride = current(id);
      const members = ride.taken > 1;
      const inside = Date.parse(ride.revisedAt ?? ride.departAt) - options.now() <= 15 * 60_000;
      return {
        ok: true,
        value: { refund: !members, noShow: members && inside, waiverAvailable: true },
      };
    },
    cancel: (id) => write('cancel', { id }, () => update(id, () => ({ status: 'cancelled' }))),
    arrive: (id) =>
      write('arrive', { id }, () =>
        update(id, mine({ arrivedAt: iso(options.now()), lateUntil: null, lateAt: null })),
      ),
    undoArrive: (id) => write('undoArrive', { id }, () => update(id, mine({ arrivedAt: null }))),
    late: (id, minutes) =>
      write('late', { id, minutes }, () =>
        update(
          id,
          mine(
            minutes === null
              ? { lateUntil: null, lateAt: null }
              : {
                  lateAt: iso(options.now()),
                  lateUntil: iso(options.now() + minutes * 60_000),
                },
          ),
        ),
      ),
    reviseTime: (id, departs) =>
      write('reviseTime', { id, departs }, () => update(id, () => ({ revisedAt: departs }))),
    updateDetails: (id, input) =>
      write('updateDetails', { id, ...input }, () => update(id, () => ({ details: input }))),
    setSplitMode: (id, mode) =>
      write('setSplitMode', { id, mode }, () => update(id, () => ({ splitMode: mode }))),
    depart: (id, boarded) =>
      write('depart', { id, boarded }, () =>
        update(id, (ride) => {
          const on = new Set([
            ...boarded,
            ...activeMembers(ride)
              .filter((m) => m.organiser)
              .map((m) => m.id),
          ]);
          return {
            status: 'departed',
            departedAt: iso(options.now()),
            appealEndsAt: iso(options.now() + 72 * 3_600_000),
            taken: on.size,
            members: mapMembers(ride, (m) => ({
              ...m,
              status: on.has(m.id) ? 'boarded' : 'no_show',
            })),
          };
        }),
      ),
    appeal: (id) => write('appeal', { id }, () => update(id, () => ({ myStatus: 'appealed' }))),
    confirmAppeal: (id, member) =>
      write('confirmAppeal', { id, member }, () =>
        update(id, (ride) => ({
          members: mapMembers(ride, (m) => (m.id === member ? { ...m, status: 'boarded' } : m)),
        })),
      ),
  };
}
