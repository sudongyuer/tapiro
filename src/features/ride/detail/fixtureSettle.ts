import type { CurrencyCode, Money } from '@/lib/money';

import { departed, FIXTURE_VIEWER, JIE, KLIN, LONG_NAME, member, MING, YA } from './fixtureDetails';
import type { RideDetail, RideMember, SettleRider } from './types';

export const SETTLE_SCENES = [
  'reach',
  'reachRider',
  'reachGrab',
  'paying',
  'paidSome',
  'paidSomeRider',
  'owing',
  'settled',
  'settledOrganiser',
  'grabSettled',
  'settleWorst',
  'settleCny',
  'settleOne',
] as const;
export type SettleScene = (typeof SETTLE_SCENES)[number];

export const isSettleScene = (value: unknown): value is SettleScene =>
  SETTLE_SCENES.some((scene) => scene === value);

export const RIDE_PAYMENT_IDS = {
  mine: 'fixture-ride-owe',
  ming: 'fixture-ride-owed',
  ya: 'fixture-ride-owed-due',
} as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const iso = (time: number) => new Date(time).toISOString();
const myr = (minor: number): Money => ({ minor, currency: 'MYR' });

type Seat = { id: string; name: string };

function rider(seat: Seat, share: Money, patch: Partial<SettleRider> = {}): SettleRider {
  return {
    id: seat.id,
    name: seat.name,
    tier: 'reliable',
    share,
    paid: 'due',
    paymentId: null,
    methodType: null,
    markedPaidAt: null,
    settledAt: null,
    hasProof: false,
    dueSince: null,
    dispute: null,
    ...patch,
  };
}

function boardedMembers(organiser: Seat, riders: Seat[], noShow: Seat | null): RideMember[] {
  return [
    member(organiser, { organiser: true, status: 'boarded' }),
    ...riders.map((seat) => member(seat, { status: 'boarded' })),
    ...(noShow ? [member(noShow, { status: 'no_show' })] : []),
  ];
}

const KLIN_SEAT = { id: KLIN, name: '小林' };
const MING_SEAT = { id: MING, name: '阿明' };
const YA_SEAT = { id: YA, name: '小雅' };
const JIE_SEAT = { id: JIE, name: '阿杰' };

function ride(
  now: number,
  options: {
    organiser: boolean;
    reachedAgo: number | null;
    status: RideDetail['status'];
    patch?: Partial<RideDetail>;
  },
): RideDetail {
  const reached = options.reachedAgo === null ? null : now - options.reachedAgo;
  const hoursAgo = Math.max(1, Math.round(((options.reachedAgo ?? 0) + 54 * MINUTE) / HOUR));
  const me = options.organiser
    ? { id: FIXTURE_VIEWER, name: '小林' }
    : { id: FIXTURE_VIEWER, name: '小雅' };
  const organiser = options.organiser ? me : KLIN_SEAT;
  const riders = options.organiser ? [MING_SEAT, YA_SEAT] : [MING_SEAT, me];
  const view = departed(now, hoursAgo, {});
  return {
    ...view,
    status: options.status,
    seats: 4,
    taken: 3,
    estimate: myr(7_600),
    role: options.organiser ? 'organiser' : 'member',
    myStatus: 'boarded',
    organiser: { ...organiser, tier: 'reliable' },
    organiserName: organiser.name,
    reachedAt: reached === null ? null : iso(reached),
    details: { meetingNote: null, plate: 'VKM 4821 · 白色 Alza', eta: view.details?.eta ?? null },
    members: boardedMembers(organiser, riders, JIE_SEAT),
    ...options.patch,
  };
}

function split(
  now: number,
  organiser: boolean,
  sentAgo: number,
  states: { ming: SettleRider['paid']; mine: SettleRider['paid'] },
  receipt = true,
) {
  const sent = now - sentAgo;
  const due = { dueSince: iso(sent) };
  const paidAt = (state: SettleRider['paid'], at: number) => ({
    paid: state,
    markedPaidAt: state === 'due' ? null : iso(at),
    settledAt: state === 'settled' ? iso(at + 9 * MINUTE) : null,
    methodType: state === 'due' ? null : 'duitnow_qr',
  });
  const ming = rider(MING_SEAT, myr(2_470), {
    ...(organiser ? { ...due, paymentId: RIDE_PAYMENT_IDS.ming, hasProof: true } : {}),
    ...paidAt(states.ming, sent + 5 * MINUTE),
    ...(organiser ? {} : { methodType: null, markedPaidAt: null, settledAt: null }),
  });
  const other = organiser
    ? rider(YA_SEAT, myr(2_470), {
        ...due,
        paymentId: RIDE_PAYMENT_IDS.ya,
        ...paidAt(states.mine, sent + 20 * HOUR),
      })
    : rider({ id: FIXTURE_VIEWER, name: '小雅' }, myr(2_470), {
        ...due,
        paymentId: RIDE_PAYMENT_IDS.mine,
        ...paidAt(states.mine, sent + 20 * HOUR),
      });
  return {
    settle: {
      total: myr(7_400),
      organiserShare: myr(2_460),
      sentAt: iso(sent),
      receipt: receipt ? 'ride-airport/fixture-receipt.jpg' : null,
      riders: [ming, other],
    },
    myShare: organiser ? myr(2_460) : myr(2_470),
  };
}

function worst(now: number, currency: CurrencyCode, organiser: boolean): RideDetail {
  const total = currency === 'MYR' ? 100_000 : 160_000;
  const share = Math.ceil(total / 6 / 10) * 10;
  const names = Array.from({ length: 5 }, (_, index) => ({
    id: index === 4 && !organiser ? FIXTURE_VIEWER : `fixture-ride-long-${index}`,
    name: `${LONG_NAME} ${index + 1}`,
  }));
  const lead = organiser ? { id: FIXTURE_VIEWER, name: LONG_NAME } : { id: KLIN, name: LONG_NAME };
  const sent = now - 26 * HOUR;
  const base = ride(now, { organiser, reachedAgo: 26 * HOUR + MINUTE, status: 'settling' });
  return {
    ...base,
    seats: 6,
    taken: 6,
    start: {
      label: 'Sunway Pyramid Convention Centre 旁边的 Sunway Lagoon 正门售票处南门',
      short: '谷中城北庭正门口',
      kind: 'mall',
    },
    dest: {
      label: 'Kuala Lumpur International Airport Terminal 2 第 2 航站楼出发层',
      short: '吉隆坡第二机场站',
      kind: 'airport',
    },
    estimate: { minor: total, currency },
    currency,
    organiser: { ...lead, tier: 'very_reliable' },
    organiserName: lead.name,
    members: boardedMembers(lead, names, null),
    settle: {
      total: { minor: total, currency },
      organiserShare: { minor: total - share * 5, currency },
      sentAt: iso(sent),
      receipt: 'ride-airport/fixture-receipt.jpg',
      riders: names.map((seat, index) =>
        rider(
          seat,
          { minor: share, currency },
          {
            paid: index % 3 === 0 ? 'settled' : index % 3 === 1 ? 'paid' : 'due',
            ...(organiser || seat.id === FIXTURE_VIEWER
              ? {
                  paymentId: `fixture-ride-long-payment-${index}`,
                  dueSince: iso(sent),
                  hasProof: index % 3 === 1,
                  methodType: index % 3 === 2 ? null : 'alipay',
                  markedPaidAt: index % 3 === 2 ? null : iso(sent + HOUR),
                  settledAt: index % 3 === 0 ? iso(sent + 2 * HOUR) : null,
                  dispute:
                    index === 2
                      ? { note: '我中途在 Putrajaya 下车了，应该少一点', at: iso(sent) }
                      : null,
                }
              : {}),
          },
        ),
      ),
    },
    myShare: { minor: organiser ? total - share * 5 : share, currency },
  };
}

export function settleScene(scene: SettleScene, now: number): RideDetail {
  switch (scene) {
    case 'reach':
      return ride(now, { organiser: true, reachedAgo: null, status: 'departed' });
    case 'reachRider':
      return ride(now, { organiser: false, reachedAgo: 2 * MINUTE, status: 'arrived' });
    case 'reachGrab':
      return ride(now, {
        organiser: true,
        reachedAgo: null,
        status: 'departed',
        patch: { splitMode: 'grab' },
      });
    case 'paying':
      return ride(now, {
        organiser: false,
        reachedAgo: 2 * MINUTE,
        status: 'settling',
        patch: split(now, false, MINUTE, { ming: 'due', mine: 'due' }),
      });
    case 'paidSome':
      return ride(now, {
        organiser: true,
        reachedAgo: 16 * MINUTE,
        status: 'settling',
        patch: split(now, true, 14 * MINUTE, { ming: 'paid', mine: 'due' }),
      });
    case 'paidSomeRider':
      return ride(now, {
        organiser: false,
        reachedAgo: 16 * MINUTE,
        status: 'settling',
        patch: split(now, false, 14 * MINUTE, { ming: 'paid', mine: 'due' }),
      });
    case 'owing':
      return ride(now, {
        organiser: false,
        reachedAgo: 25 * HOUR + 46 * MINUTE,
        status: 'settling',
        patch: split(now, false, 25 * HOUR + 44 * MINUTE, { ming: 'settled', mine: 'due' }),
      });
    case 'settled':
    case 'settledOrganiser': {
      const organiser = scene === 'settledOrganiser';
      const paid = split(now, organiser, 26 * HOUR + 39 * MINUTE, {
        ming: 'settled',
        mine: 'settled',
      });
      return ride(now, {
        organiser,
        reachedAgo: 26 * HOUR + 41 * MINUTE,
        status: 'closed',
        patch: {
          ...paid,
          settledAt: iso(now - MINUTE),
          sticker: { id: 'fixture-ride-sticker', collected: false },
        },
      });
    }
    case 'grabSettled':
      return ride(now, {
        organiser: true,
        reachedAgo: MINUTE,
        status: 'closed',
        patch: {
          splitMode: 'grab',
          settledAt: iso(now - MINUTE),
          sticker: { id: 'fixture-ride-sticker', collected: false },
        },
      });
    case 'settleWorst':
      return worst(now, 'MYR', true);
    case 'settleCny':
      return worst(now, 'CNY', false);
    case 'settleOne': {
      const view = ride(now, {
        organiser: true,
        reachedAgo: 3 * MINUTE,
        status: 'settling',
        patch: split(now, true, 2 * MINUTE, { ming: 'paid', mine: 'due' }),
      });
      return {
        ...view,
        seats: 2,
        taken: 2,
        members: boardedMembers({ id: FIXTURE_VIEWER, name: '小林' }, [MING_SEAT], null),
        settle: view.settle && {
          ...view.settle,
          total: myr(3_100),
          organiserShare: myr(1_550),
          riders: [{ ...view.settle.riders[0], share: myr(1_550) }],
        },
        myShare: myr(1_550),
      };
    }
  }
}
