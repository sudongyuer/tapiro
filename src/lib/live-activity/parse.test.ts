import { describe, expect, test } from 'bun:test';

import { toLiveActivityRead } from './parse';

const toLiveActivitySubjects = (value: unknown) => toLiveActivityRead(value).subjects;

const bountyRow = {
  kind: 'bounty',
  id: 'b1',
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: '2026-11-12T05:02:00+00:00',
  etaAt: '2026-11-12T05:14:00+00:00',
  arrivedAt: null,
};

const rideRow = {
  kind: 'ride',
  id: 'r1',
  phase: 'meetup',
  startName: '双威',
  startHome: true,
  gatherAt: '2026-11-12T04:51:00+00:00',
  departAt: '2026-11-12T05:21:00+00:00',
  arrived: 2,
  total: 4,
  departedAt: null,
  aboard: 0,
};

describe('live activity subjects', () => {
  test('a bounty on the way and a ride at 集合 are read with times in milliseconds', () => {
    expect(toLiveActivitySubjects([bountyRow, rideRow])).toEqual([
      {
        kind: 'bounty',
        id: 'b1',
        phase: 'onTheWay',
        helper: '小林',
        place: '图书馆',
        task: '帮取快递',
        leftAt: Date.UTC(2026, 10, 12, 5, 2),
        etaAt: Date.UTC(2026, 10, 12, 5, 14),
      },
      {
        kind: 'ride',
        id: 'r1',
        phase: 'meetup',
        start: { name: '双威', home: true },
        gatherAt: Date.UTC(2026, 10, 12, 4, 51),
        departAt: Date.UTC(2026, 10, 12, 5, 21),
        arrived: 2,
        total: 4,
      },
    ]);
  });

  test('the final steps carry their own time', () => {
    const [bounty, ride] = toLiveActivitySubjects([
      { ...bountyRow, phase: 'arrived', etaAt: null, arrivedAt: '2026-11-12T05:13:00+00:00' },
      { ...rideRow, phase: 'departed', departedAt: '2026-11-12T05:20:00+00:00', aboard: 3 },
    ]);
    expect(bounty).toMatchObject({ phase: 'arrived', arrivedAt: Date.UTC(2026, 10, 12, 5, 13) });
    expect(ride).toMatchObject({ phase: 'departed', aboard: 3 });
  });

  test('a bounty with no place keeps the place empty', () => {
    expect(toLiveActivitySubjects([{ ...bountyRow, place: null }])[0]).toMatchObject({
      place: null,
    });
  });

  test('an unreadable row is reported by its link and the others are still read', () => {
    const rows = [{ ...bountyRow, helper: null }, { ...rideRow, phase: 'settled' }, rideRow];
    const read = toLiveActivityRead(rows);
    expect(read.subjects.map((subject) => subject.id)).toEqual(['r1']);
    expect(read.unreadable).toEqual(['tapiro://bounty/status/b1', 'tapiro://ride/r1']);
  });

  test('an answer that is not a list fails the whole read', () => {
    expect(() => toLiveActivitySubjects({ error: 'x' })).toThrow();
  });
});
