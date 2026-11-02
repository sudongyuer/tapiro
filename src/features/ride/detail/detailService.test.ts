import { describe, expect, test } from 'bun:test';

import { createRideDetail } from './detailState';
import {
  createSupabaseRideDetailService,
  RideDetailMissing,
  toCancelPreview,
  toRideFailure,
} from './detailService';
import { applyNotes, toApplyNote, toDetailsInput } from './drafts';
import { createFixtureRideDetailService } from './fixtureDetailService';
import { FIXTURE_VIEWER } from './fixtureDetails';
import { walkingDirectionsUrl } from './links';
import { toRideDetail } from './parseDetail';

const NOW = Date.parse('2026-11-02T14:07:00Z');

const row = {
  id: 'r1',
  start: { label: 'Sunway Geo Residences', short: '双威', kind: 'home' },
  dest: { label: 'KLIA2', short: 'KLIA2', kind: 'airport' },
  departAt: '2026-11-03T22:30:00Z',
  revisedAt: null,
  day: '2026-11-04',
  status: 'open',
  seats: 3,
  taken: 2,
  splitMode: 'tapiro',
  estimate: { minor: 7600, currency: 'MYR' },
  airport: true,
  flightDepartsAt: null,
  largeBags: 2,
  settledAt: null,
  organiser: { id: 'o1', name: '小林', tier: 'reliable' },
  role: 'organiser',
  myStatus: 'accepted',
  createdAt: '2026-11-02T13:04:00Z',
  startPoint: { latitude: 3.07331, longitude: 101.60782 },
  details: { meetingNote: '大堂门口', plate: null, eta: null },
  members: [
    {
      id: 'o1',
      name: '小林',
      tier: 'reliable',
      status: 'accepted',
      organiser: true,
      joinedAt: '2026-11-02T13:04:00Z',
    },
    {
      id: 'm1',
      name: null,
      tier: 'nonsense',
      status: 'accepted',
      organiser: false,
      arrivedAt: null,
    },
  ],
  requests: [
    {
      id: 'q1',
      name: '阿杰',
      tier: 'new_friend',
      note: '箱子',
      requestedAt: '2026-11-02T14:00:00Z',
    },
  ],
};

describe('ride_detail parsing', () => {
  test('reads the organiser view with members, requests and details', () => {
    const detail = toRideDetail(row);
    expect(detail.role).toBe('organiser');
    expect(detail.organiser?.name).toBe('小林');
    expect(detail.members?.map((m) => [m.id, m.organiser, m.tier])).toEqual([
      ['o1', true, 'reliable'],
      ['m1', false, 'new_friend'],
    ]);
    expect(detail.requests?.[0].note).toBe('箱子');
    expect(detail.details?.meetingNote).toBe('大堂门口');
  });

  test('a viewer gets no members, requests or details', () => {
    const detail = toRideDetail({
      ...row,
      role: 'viewer',
      members: null,
      requests: null,
      details: null,
    });
    expect([detail.members, detail.requests, detail.details]).toEqual([null, null, null]);
  });

  test('an unknown role or member state is rejected, never guessed', () => {
    expect(() => toRideDetail({ ...row, role: 'admin' })).toThrow();
    expect(() =>
      toRideDetail({ ...row, members: [{ ...row.members[0], status: 'left' }] }),
    ).toThrow();
  });
});

describe('ride detail service', () => {
  test('slugs become typed failures', () => {
    expect(toRideFailure({ message: 'full' })).toBe('full');
    expect(toRideFailure({ message: 'not_organiser' })).toBe('notMember');
    expect(toRideFailure({ message: 'invalid_transition' })).toBe('transition');
    expect(toRideFailure(new Error('network'))).toBe('failed');
    expect(toCancelPreview({ refund: true, noShow: false, waiverAvailable: null })).toEqual({
      refund: true,
      noShow: false,
      waiverAvailable: null,
    });
  });

  test('a missing ride is told apart from a failed load', async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: 'ride_not_found' } }),
    } as never;
    const service = createSupabaseRideDetailService(client, () => 'MYR');
    await expect(service.load('r1')).rejects.toBeInstanceOf(RideDetailMissing);
    const down = createSupabaseRideDetailService(
      { rpc: async () => ({ data: null, error: { message: 'fetch failed' } }) } as never,
      () => 'MYR',
    );
    await expect(down.load('r1')).rejects.not.toBeInstanceOf(RideDetailMissing);
  });

  test('a write sends the RPC arguments and maps its rejection', async () => {
    const calls: unknown[] = [];
    const client = {
      rpc: async (name: string, args: unknown) => {
        calls.push([name, args]);
        return { data: null, error: { message: 'departed' } };
      },
    } as never;
    const service = createSupabaseRideDetailService(client, () => 'MYR');
    expect(await service.depart('r1', ['m1'])).toEqual({ ok: false, reason: 'departed' });
    expect(calls).toEqual([['depart_ride', { ride: 'r1', boarded: ['m1'] }]]);
  });
});

describe('detail store', () => {
  test('a failed refresh keeps the last detail as stale; a missing ride is gone', async () => {
    let fail = false;
    const store = createRideDetail({
      load: async () => {
        if (fail) throw new Error('down');
        return toRideDetail(row);
      },
      now: () => NOW,
    });
    await store.load();
    fail = true;
    await store.load();
    const load = store.get().load;
    expect(load.kind === 'ready' && load.stale).toBe(true);

    const gone = createRideDetail({
      load: async () => {
        throw new RideDetailMissing('r1');
      },
      now: () => NOW,
    });
    await gone.load();
    expect(gone.get().load.kind).toBe('gone');
  });

  test('a failed write is never replayed and keeps the failure for the screen', async () => {
    let writes = 0;
    let loads = 0;
    const store = createRideDetail({
      load: async () => {
        loads += 1;
        return toRideDetail(row);
      },
      now: () => NOW,
    });
    await store.load();
    const answer = await store.act('arrive', async () => {
      writes += 1;
      return { ok: false, reason: 'failed' };
    });
    expect(answer).toEqual({ ok: false, reason: 'failed' });
    expect(writes).toBe(1);
    expect(loads).toBe(1);
    expect(store.get().action).toEqual({ kind: 'failed', action: 'arrive', reason: 'failed' });
  });

  test('a typed rejection reloads so the screen shows the new state', async () => {
    let loads = 0;
    const store = createRideDetail({
      load: async () => {
        loads += 1;
        return toRideDetail(row);
      },
      now: () => NOW,
    });
    await store.act('decide', async () => ({ ok: false, reason: 'full' }), 'q1');
    expect(loads).toBe(1);
  });
});

describe('drafts and links', () => {
  test('the apply note is trimmed, optional and at most 140 characters', () => {
    expect(toApplyNote('  ')).toBeNull();
    expect(toApplyNote(' 箱子 ')).toBe('箱子');
    expect(toApplyNote('字'.repeat(141))).toBeUndefined();
    applyNotes.set('r1', '箱子');
    expect(applyNotes.get('r1')).toBe('箱子');
    applyNotes.reset();
    expect(applyNotes.get('r1')).toBeNull();
  });

  test('details send null for blanks and refuse a 41-character plate', () => {
    expect(toDetailsInput({ plate: ' VEN 2381 ', eta: null, meetingNote: '' })).toEqual({
      plate: 'VEN 2381',
      eta: null,
      meetingNote: null,
    });
    expect(toDetailsInput({ plate: 'A'.repeat(41), eta: null, meetingNote: '' })).toBeNull();
  });

  test('导航到集合点 asks Apple Maps for walking directions to the exact point', () => {
    expect(walkingDirectionsUrl({ latitude: 3.07331, longitude: 101.60782 })).toBe(
      'https://maps.apple.com/directions?destination=3.07331,101.60782&mode=walking',
    );
  });
});

describe('fixture detail service', () => {
  test('writes change what the next load returns', async () => {
    const service = createFixtureRideDetailService({
      scene: 'meetup',
      fail: 'none',
      variant: 'demo',
      now: () => NOW,
      delayMs: 0,
    });
    await service.arrive('ride-x');
    const after = await service.load('ride-x');
    expect(after.arrivedAt).not.toBeNull();
    expect(after.members?.find((m) => m.id === FIXTURE_VIEWER)?.arrivedAt).not.toBeNull();
  });

  test('出发 boards the ticked and the organiser and marks the rest no-show', async () => {
    const service = createFixtureRideDetailService({
      scene: 'depart',
      fail: 'none',
      variant: 'demo',
      now: () => NOW,
      delayMs: 0,
    });
    await service.depart('ride-x', ['fixture-ride-aming', 'fixture-ride-xiaoya']);
    const after = await service.load('ride-x');
    expect(after.status).toBe('departed');
    expect(after.members?.map((m) => m.status)).toEqual([
      'boarded',
      'boarded',
      'boarded',
      'no_show',
    ]);
  });
});
