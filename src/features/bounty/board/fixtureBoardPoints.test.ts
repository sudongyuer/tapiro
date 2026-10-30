import { describe, expect, test } from 'bun:test';

import { SUNWAY_PYRAMID } from '@/lib/location/fixtureLocationService';

import { BOARDS, FIXTURE_BOARDS, snapPoint } from './fixtureBoardData';
import { createFixtureBoardService, fixtureBoardOptions } from './fixtureBoardService';
import { distanceM } from './originStore';
import type { BoardOrigin } from './types';

const ME: BoardOrigin = { kind: 'me', point: SUNWAY_PYRAMID };
const service = (board: string) =>
  createFixtureBoardService(
    fixtureBoardOptions((name) => (name === 'uiVerifyBoard' ? board : undefined), 'demo'),
  );

const onGrid = (value: number) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-9;

describe('snapPoint', () => {
  test('rounds to the 0.001° grid', () => {
    expect(snapPoint({ latitude: 3.07255, longitude: 101.61045 })).toEqual({
      latitude: 3.073,
      longitude: 101.61,
    });
    expect(snapPoint({ latitude: -3.0004, longitude: 101.6086 })).toEqual({
      latitude: -3,
      longitude: 101.609,
    });
  });
});

describe('fixture board points', () => {
  test.each([...BOARDS])('%s rows carry the snapped point, null without a place', async (board) => {
    const { items } = await service(board).page(ME, 'all', null);
    for (const item of items) {
      const source = FIXTURE_BOARDS[board].find((bounty) => bounty.id === item.id);
      if (source?.point) {
        expect(item.point).toEqual(snapPoint(source.point));
        expect(onGrid(item.point!.latitude) && onGrid(item.point!.longitude)).toBe(true);
      } else {
        expect(item.point).toBeNull();
      }
    }
  });

  test('crowded: six bounties in one cell and four within 30 m in four cells', async () => {
    const { items } = await service('crowded').page(ME, 'all', null);
    expect(items).toHaveLength(10);
    const raw = FIXTURE_BOARDS.crowded;
    const cells = new Map<string, string[]>();
    for (const item of items) {
      const key = `${item.point!.latitude},${item.point!.longitude}`;
      cells.set(key, [...(cells.get(key) ?? []), item.id]);
    }
    const sizes = [...cells.values()].map((ids) => ids.length).sort();
    expect(sizes).toEqual([1, 1, 1, 1, 6]);
    const near = [...cells.values()].filter((ids) => ids.length === 1).flat();
    const points = near.map((id) => raw.find((bounty) => bounty.id === id)!.point!);
    for (const a of points) for (const b of points) expect(distanceM(a, b)).toBeLessThan(30);
  });

  test('the crowded board is picked by its launch argument', () => {
    expect(
      fixtureBoardOptions((name) => (name === 'uiVerifyBoard' ? 'crowded' : undefined), 'demo')
        .board,
    ).toBe('crowded');
  });
});
