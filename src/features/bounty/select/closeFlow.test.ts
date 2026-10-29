import { describe, expect, test } from 'bun:test';

import { createFixtureStatusService } from '../status/fixtureStatusService';
import type { PostCharge } from '../status/types';
import { createCloseFlow } from './closeFlow';

const NOW = new Date('2026-10-29T04:00:00.000Z');

function setup(
  options: {
    charge?: PostCharge;
    scenario?: 'open' | 'assigned';
    accept?: boolean;
    detailFails?: boolean;
    failFirst?: string;
  } = {},
) {
  const fixture = createFixtureStatusService({
    scenario: options.scenario ?? 'open',
    role: 'poster',
    load: 'ok',
    waiver: 'available',
    charge: options.charge ?? 'free',
    failFirst: options.failFirst,
    now: () => NOW,
  });
  const asked: PostCharge[] = [];
  let reloads = 0;
  const { service } = fixture;
  const flow = createCloseFlow({
    detail: () =>
      options.detailFails ? Promise.reject(new Error('offline')) : service.detail('b1'),
    close: () => service.close('b1'),
    reload: async () => {
      reloads += 1;
    },
  });
  const ask = async (charge: PostCharge) => {
    asked.push(charge);
    return options.accept ?? true;
  };
  const closes = () => fixture.calls().filter((call) => call.name === 'close_bounty').length;
  return { flow, close: () => flow.close(ask), asked, closes, reloads: () => reloads };
}

describe('close before selection (58A)', () => {
  test('asks with the charge from bounty_detail, then closes and reloads', async () => {
    const { flow, close, asked, closes, reloads } = setup({ charge: 'coin' });
    await close();
    expect(asked).toEqual(['coin']);
    expect(closes()).toBe(1);
    expect(flow.get()).toEqual({ kind: 'closed' });
    expect(reloads()).toBe(1);
  });

  test('declining the sheet sends nothing', async () => {
    const { flow, close, closes } = setup({ accept: false });
    await close();
    expect(closes()).toBe(0);
    expect(flow.get()).toEqual({ kind: 'idle' });
  });

  test('a failed read shows the failure and opens no sheet', async () => {
    const { flow, close, asked, closes } = setup({ detailFails: true });
    await close();
    expect(flow.get()).toEqual({ kind: 'failed' });
    expect(asked).toHaveLength(0);
    expect(closes()).toBe(0);
  });

  test('a bounty no longer open says it changed and reloads', async () => {
    const { flow, close, asked, reloads } = setup({ scenario: 'assigned' });
    await close();
    expect(flow.get()).toEqual({ kind: 'changed' });
    expect(asked).toHaveLength(0);
    expect(reloads()).toBe(1);
  });

  test('a failed close is not replayed; the next tap sends once more', async () => {
    const { flow, close, closes, reloads } = setup({ failFirst: 'close_bounty' });
    await close();
    expect(flow.get()).toEqual({ kind: 'failed' });
    expect(closes()).toBe(1);
    expect(reloads()).toBe(0);
    await close();
    expect(flow.get()).toEqual({ kind: 'closed' });
    expect(closes()).toBe(2);
  });

  test('a second tap while one is in flight is ignored', async () => {
    const { close, closes } = setup();
    await Promise.all([close(), close()]);
    expect(closes()).toBe(1);
  });
});
