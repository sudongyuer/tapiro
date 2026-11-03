import { describe, expect, test } from 'bun:test';

import { fixtureRideList } from './fixtureRides';
import { createFixtureRideService, fixtureRideOptions } from './fixtureRideService';
import { rideListModel } from './listModel';
import { ticketModel } from './ticket';

const NOW = Date.parse('2026-11-02T14:07:00Z');

function service(args: Record<string, string>, variant: 'demo' | 'worst' = 'demo') {
  const options = {
    ...fixtureRideOptions((name) => args[name], variant),
    now: () => NOW,
    delayMs: 0,
  };
  return createFixtureRideService(options);
}

describe('fixture rides', () => {
  test('the demo list covers mine, urgent, requests, full and airport', () => {
    const model = rideListModel(fixtureRideList('demo', 'demo', NOW), NOW);
    const [leaving, requests] = model.mine;
    expect(ticketModel(leaving, NOW, leaving).status.kind).toBe('leaving');
    expect(ticketModel(requests, NOW, requests).status.kind).toBe('requests');
    const joinable = model.days.flatMap((day) => day.rides);
    expect(joinable.map((ride) => ticketModel(ride, NOW).status.kind)).toContain('full');
    expect(joinable.some((ride) => ticketModel(ride, NOW).airport !== null)).toBe(true);
    expect(model.historyCount).toBeGreaterThan(0);
  });

  test('the worst list carries an 80-character label, 8-character short names and both limits', () => {
    const data = fixtureRideList('demo', 'worst', NOW);
    const [leaving, requests] = data.mine;
    expect([...leaving.start.label]).toHaveLength(80);
    expect([...leaving.start.short]).toHaveLength(8);
    expect([...leaving.dest.short]).toHaveLength(8);
    expect(leaving.estimate).toEqual({ minor: 100_000, currency: 'MYR' });
    expect(requests.estimate).toEqual({ minor: 160_000, currency: 'CNY' });
  });

  test('empty lists nothing; first fails once; refresh fails after the first load', async () => {
    expect(await service({ uiVerifyRides: 'empty' }).mine()).toEqual({
      items: [],
      historyCount: 0,
    });
    const listLoad = (rides: ReturnType<typeof service>) =>
      Promise.all([rides.mine(), rides.nearby(null, null)]);
    const first = service({ uiVerifyRideFail: 'first' });
    await expect(listLoad(first)).rejects.toThrow();
    expect((await listLoad(first))[0].items.length).toBeGreaterThan(0);
    const refresh = service({ uiVerifyRideFail: 'refresh' });
    expect((await listLoad(refresh))[0].items.length).toBeGreaterThan(0);
    await expect(listLoad(refresh)).rejects.toThrow();
  });

  test('a reminder sync before the list does not use up the first-load failure', async () => {
    const first = service({ uiVerifyRideFail: 'first' });
    expect((await first.mine()).items.length).toBeGreaterThan(0);
    await expect(Promise.all([first.mine(), first.nearby(null, null)])).rejects.toThrow();
  });

  test('a published ride appears first in mine; without a payee it is refused', async () => {
    const rides = service({});
    const outcome = await rides.publish({
      id: 'new',
      start_label: 'A',
      start_short: 'A',
      start_latitude: 3,
      start_longitude: 101,
      dest_label: 'B',
      dest_short: 'B',
      dest_latitude: 3,
      dest_longitude: 101,
      depart_at: new Date(NOW + 3_600_000).toISOString(),
      seats: 4,
      currency: 'MYR',
      split_mode: 'tapiro',
      estimate_minor: null,
      flight_departs_at: null,
      large_bags: null,
      meeting_note: null,
    });
    expect(outcome).toEqual({ ok: true, id: 'new', charge: 'free' });
    expect((await rides.mine()).items[0].id).toBe('new');
    expect((await service({ uiVerifyRidePayee: 'none' }).postStatus()).hasPayee).toBe(false);
  });
});
