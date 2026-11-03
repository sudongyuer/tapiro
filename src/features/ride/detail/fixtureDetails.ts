import type { FixtureVariant } from '@/lib/fixtureVariant';
import { addDays, localDayKey, localTimeOn } from '@/lib/deviceClock';

import type { RideMember, RideDetail, RideRequest, Tier } from './types';

export const FIXTURE_VIEWER = '00000000-0000-4000-8000-000000000001';

export const DETAIL_SCENES = [
  'viewer',
  'viewerMall',
  'applicant',
  'organiser',
  'member',
  'meetup',
  'meetupArrived',
  'meetupLate',
  'depart',
  'goOrCancel',
  'appealOpen',
  'appealPending',
  'appealLapsed',
  'confirmAppeal',
  'worst',
] as const;
export type DetailScene = (typeof DETAIL_SCENES)[number];

const MINUTE = 60_000;
const iso = (time: number) => new Date(time).toISOString();

export const KLIN = 'fixture-ride-xiaolin';
export const MING = 'fixture-ride-aming';
export const JIE = 'fixture-ride-ajie';
export const YA = 'fixture-ride-xiaoya';
const WEN = 'fixture-ride-awen';

export const DETAIL_PEOPLE = [
  { id: KLIN, name: '小林' },
  { id: MING, name: '阿明' },
  { id: JIE, name: '阿杰' },
  { id: YA, name: '小雅' },
  { id: WEN, name: '阿雯' },
];

export const LONG_NAME = 'Nurul Aina binti Ahmad Faizal Rahman Wong';
const LONG_NOTE =
  '我有一个 28 寸的大箱子和一个登机箱，还有一把吉他，可以放后备箱吗？如果放不下我可以抱着吉他坐后排，麻烦小林确认一下';

function tomorrowAt(now: number, hours: number, minutes: number) {
  return localTimeOn(addDays(localDayKey(now), 1), hours, minutes);
}

export type Person = { id: string; name: string; tier?: Tier };

export function member(person: Person, patch: Partial<RideMember> = {}): RideMember {
  return {
    id: person.id,
    name: person.name,
    tier: person.tier ?? 'reliable',
    status: 'accepted',
    organiser: false,
    arrivedAt: null,
    lateUntil: null,
    lateAt: null,
    joinedAt: null,
    ...patch,
  };
}

function base(now: number, patch: Partial<RideDetail>): RideDetail {
  const departs = tomorrowAt(now, 6, 30);
  return {
    id: 'ride-airport',
    start: { label: 'Sunway Geo Residences', short: '双威', kind: 'home' },
    dest: { label: 'KLIA2 第 2 航站楼', short: 'KLIA2', kind: 'airport' },
    departAt: iso(departs),
    revisedAt: null,
    status: 'open',
    seats: 3,
    taken: 2,
    splitMode: 'tapiro',
    estimate: { minor: 7_600, currency: 'MYR' },
    airport: true,
    flightDepartsAt: iso(tomorrowAt(now, 9, 10)),
    largeBags: 2,
    settledAt: null,
    organiserName: '小林',
    role: 'viewer',
    myStatus: null,
    myNote: null,
    arrivedAt: null,
    lateUntil: null,
    organiser: { id: KLIN, name: '小林', tier: 'reliable' },
    createdAt: iso(now - 63 * MINUTE),
    fullAt: null,
    departedAt: null,
    reachedAt: null,
    appealEndsAt: null,
    appealLapsed: false,
    noShow: null,
    startPoint: { latitude: 3.0733, longitude: 101.6078 },
    details: null,
    members: null,
    requests: null,
    currency: 'MYR',
    settle: null,
    myShare: null,
    sticker: null,
    ...patch,
  };
}

const meetingNote = '有 1 个大箱子，叫 6 座 Grab。我的航班 09:10，晚了不等。';

function organiserView(now: number): RideDetail {
  const me = { id: FIXTURE_VIEWER, name: '小林' };
  const request: RideRequest = {
    id: JIE,
    name: '阿杰',
    tier: 'new_friend',
    note: '我有 1 个 24 寸箱子，可以吗？',
    requestedAt: iso(now - 5 * MINUTE),
  };
  return base(now, {
    role: 'organiser',
    myStatus: 'accepted',
    organiser: { ...me, tier: 'reliable' },
    details: { meetingNote, plate: null, eta: iso(tomorrowAt(now, 7, 20)) },
    members: [
      member(me, { organiser: true, joinedAt: iso(now - 63 * MINUTE) }),
      member({ id: MING, name: '阿明' }, { joinedAt: iso(now - 37 * MINUTE) }),
    ],
    requests: [request],
  });
}

function meetup(now: number, minutesLeft: number, patch: Partial<RideDetail> = {}): RideDetail {
  const departs = now + minutesLeft * MINUTE;
  return base(now, {
    departAt: iso(departs),
    flightDepartsAt: iso(departs + 160 * MINUTE),
    status: 'gathering',
    seats: 4,
    taken: 4,
    estimate: { minor: 7_600, currency: 'MYR' },
    createdAt: iso(departs - 9 * 60 * MINUTE - 26 * MINUTE),
    fullAt: iso(departs - 6 * 60 * MINUTE - 50 * MINUTE),
    role: 'member',
    myStatus: 'accepted',
    details: { meetingNote, plate: null, eta: iso(departs + 50 * MINUTE) },
    members: [
      member(
        { id: KLIN, name: '小林' },
        { organiser: true, arrivedAt: iso(departs - 18 * MINUTE) },
      ),
      member({ id: MING, name: '阿明' }, { arrivedAt: iso(departs - 15 * MINUTE) }),
      member({ id: JIE, name: '阿杰' }),
      member({ id: FIXTURE_VIEWER, name: '小雅' }),
    ],
    ...patch,
  });
}

function organiserMeetup(now: number, minutesLeft: number): RideDetail {
  const departs = now + minutesLeft * MINUTE;
  const said = departs - 6 * MINUTE;
  return meetup(now, minutesLeft, {
    role: 'organiser',
    organiser: { id: FIXTURE_VIEWER, name: '小林', tier: 'reliable' },
    arrivedAt: iso(departs - 18 * MINUTE),
    details: { meetingNote, plate: 'VEN 2381 · 白色 Alza', eta: iso(departs + 50 * MINUTE) },
    members: [
      member(
        { id: FIXTURE_VIEWER, name: '小林' },
        { organiser: true, arrivedAt: iso(departs - 18 * MINUTE) },
      ),
      member({ id: MING, name: '阿明' }, { arrivedAt: iso(departs - 15 * MINUTE) }),
      member({ id: YA, name: '小雅' }, { arrivedAt: iso(departs - 9 * MINUTE) }),
      member({ id: JIE, name: '阿杰' }, { lateAt: iso(said), lateUntil: iso(said + 5 * MINUTE) }),
    ],
  });
}

export function departed(now: number, hoursAgo: number, patch: Partial<RideDetail>): RideDetail {
  const departs = now - hoursAgo * 60 * MINUTE;
  return meetup(now, -hoursAgo * 60, {
    status: 'departed',
    departedAt: iso(departs + 6 * MINUTE),
    appealEndsAt: iso(departs + 6 * MINUTE + 72 * 60 * MINUTE),
    taken: 3,
    ...patch,
  });
}

function worst(now: number): RideDetail {
  const view = organiserMeetup(now, 12);
  const names = Array.from({ length: 5 }, (_, index) => `${LONG_NAME} ${index + 1}`);
  return {
    ...view,
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
    estimate: { minor: 100_000, currency: 'MYR' },
    largeBags: 9,
    details: {
      meetingNote: LONG_NOTE.slice(0, 80),
      plate: 'WXY 1234 · 银色 Toyota Vellfire 7 人座商务车（车顶有行李架）',
      eta: view.details?.eta ?? null,
    },
    members: [
      member(
        { id: FIXTURE_VIEWER, name: LONG_NAME },
        { organiser: true, arrivedAt: iso(now - 9 * MINUTE) },
      ),
      ...names.map((name, index) =>
        member(
          { id: `fixture-ride-long-${index}`, name, tier: 'very_reliable' },
          index % 3 === 0
            ? { arrivedAt: iso(now - (index + 1) * MINUTE) }
            : index % 3 === 1
              ? { lateAt: iso(now - 2 * MINUTE), lateUntil: iso(now + 13 * MINUTE) }
              : {},
        ),
      ),
    ],
    requests: [
      {
        id: 'fixture-ride-long-request',
        name: LONG_NAME,
        tier: 'new_friend',
        note: LONG_NOTE.slice(0, 80),
        requestedAt: iso(now - MINUTE),
      },
    ],
  };
}

export function fixtureRideDetail(
  scene: DetailScene,
  now: number,
  variant: FixtureVariant = 'demo',
): RideDetail {
  if (variant === 'worst') return worst(now);
  switch (scene) {
    case 'worst':
      return worst(now);
    case 'viewer':
      return base(now, {});
    case 'viewerMall': {
      const departs = tomorrowAt(now, 13, 0);
      return base(now, {
        id: 'ride-mall',
        start: { label: 'Mid Valley Megamall North Court', short: 'Mid Valley', kind: 'mall' },
        dest: { label: 'Sunway Geo', short: '双威', kind: 'home' },
        departAt: iso(departs),
        seats: 4,
        taken: 1,
        estimate: { minor: 3_600, currency: 'MYR' },
        airport: false,
        flightDepartsAt: null,
        largeBags: null,
        organiserName: '阿雯',
        organiser: { id: WEN, name: '阿雯', tier: 'very_reliable' },
      });
    }
    case 'applicant':
      return base(now, { role: 'applicant', myStatus: 'requested', myNote: '我有一个箱子' });
    case 'organiser':
      return organiserView(now);
    case 'member':
      return {
        ...organiserView(now),
        role: 'member',
        organiser: { id: KLIN, name: '小林', tier: 'reliable' },
        requests: null,
        members: [
          member({ id: KLIN, name: '小林' }, { organiser: true, joinedAt: iso(now - 63 * MINUTE) }),
          member({ id: FIXTURE_VIEWER, name: '阿明' }, { joinedAt: iso(now - 37 * MINUTE) }),
        ],
      };
    case 'meetup':
      return meetup(now, 10);
    case 'meetupArrived': {
      const view = meetup(now, 9, { arrivedAt: iso(now - MINUTE) });
      return {
        ...view,
        members:
          view.members?.map((m) =>
            m.id === FIXTURE_VIEWER ? { ...m, arrivedAt: iso(now - MINUTE) } : m,
          ) ?? null,
      };
    }
    case 'meetupLate':
      return organiserMeetup(now, 1);
    case 'depart':
      return organiserMeetup(now, -6);
    case 'goOrCancel': {
      const view = organiserMeetup(now, 10);
      return { ...view, taken: 3, members: view.members?.filter((m) => m.id !== JIE) ?? null };
    }
    case 'appealOpen':
      return departed(now, 1, {
        role: 'noShow',
        myStatus: 'no_show',
        noShow: 'counted',
        members: null,
        details: null,
      });
    case 'appealPending':
      return departed(now, 1, {
        role: 'noShow',
        myStatus: 'appealed',
        members: null,
        details: null,
      });
    case 'appealLapsed':
      return departed(now, 80, {
        role: 'noShow',
        myStatus: 'no_show',
        appealLapsed: true,
        noShow: 'counted',
        members: null,
        details: null,
      });
    case 'confirmAppeal': {
      const view = departed(now, 1, {});
      return {
        ...view,
        myStatus: 'boarded',
        members:
          view.members?.map((m) => ({
            ...m,
            status: m.id === JIE ? 'appealed' : 'boarded',
          })) ?? null,
      };
    }
  }
}

export function fixtureSceneForRide(id: string): DetailScene | null {
  if (id === 'ride-mall') return 'viewerMall';
  if (id === 'ride-airport') return 'viewer';
  return null;
}
