import { describe, expect, test } from 'bun:test';

import type { PublishRideOutcome, RidePostStatus } from '../types';
import { emptyDraft, type RideDraft } from './draft';
import { canPublish, createPublishFlow, rideCost, rideGate } from './publishFlow';

const NOW = new Date('2026-11-02T14:07:00Z');
const STATUS: RidePostStatus = {
  blocked: false,
  coins: 0,
  freePostsLeft: 2,
  freePostsPerMonth: 3,
  nextFreeAt: '2026-12-01T00:00:00Z',
  hasPayee: true,
};
const place = {
  label: 'Sunway Geo',
  latitude: 3,
  longitude: 101,
  short: '双威',
  shortEdited: false,
};
const READY: RideDraft = {
  ...emptyDraft('11111111-1111-4111-8111-111111111111', 'MYR'),
  start: place,
  dest: { ...place, label: 'KLIA2', short: 'KLIA2' },
  departAt: '2026-11-02T22:30:00.000Z',
};

function setup(outcome: PublishRideOutcome, status: RidePostStatus = STATUS) {
  const calls = { publish: 0, status: 0, cleared: 0 };
  const flow = createPublishFlow({
    service: {
      postStatus: async () => {
        calls.status += 1;
        return status;
      },
      publish: async () => {
        calls.publish += 1;
        return outcome;
      },
    },
    draft: () => READY,
    clearDraft: () => {
      calls.cleared += 1;
    },
    now: () => NOW,
  });
  const seen: string[] = [];
  const handlers = {
    onPublished: () => seen.push('published'),
    onInvalid: (error: string) => seen.push(`invalid:${error}`),
    onAlreadySent: () => seen.push('alreadySent'),
  };
  return { flow, calls, seen, handlers };
}

describe('ride publish flow', () => {
  test('the gate: no payee method comes first, then blocked, then no balance', () => {
    expect(rideGate({ ...STATUS, hasPayee: false, blocked: true })).toBe('noPayee');
    expect(rideGate({ ...STATUS, blocked: true })).toBe('blocked');
    expect(rideGate({ ...STATUS, freePostsLeft: 0, coins: 0 })).toBe('noBalance');
    expect(rideCost({ ...STATUS, freePostsLeft: 0, coins: 4 })).toEqual({
      kind: 'coin',
      balance: 4,
    });
  });

  test('publishing clears the draft once and reports it', async () => {
    const { flow, calls, seen, handlers } = setup({ ok: true, id: READY.id, charge: 'free' });
    await flow.load();
    expect(canPublish(flow.get())).toBe(true);
    await flow.publish(handlers);
    expect(seen).toEqual(['published']);
    expect(calls.cleared).toBe(1);
  });

  test('without a payee method nothing is sent', async () => {
    const { flow, calls, seen, handlers } = setup(
      { ok: true, id: READY.id, charge: 'free' },
      { ...STATUS, hasPayee: false },
    );
    await flow.load();
    await flow.publish(handlers);
    expect(calls.publish).toBe(0);
    expect(seen).toEqual([]);
  });

  test('a failure keeps the draft and is never retried by itself', async () => {
    const { flow, calls, handlers } = setup({ ok: false, reason: 'failed' });
    await flow.load();
    await flow.publish(handlers);
    expect(flow.get().rejected).toBe('failed');
    expect(calls).toEqual({ publish: 1, status: 1, cleared: 0 });
  });

  test('a server-side gate reloads the fee line instead of failing', async () => {
    const { flow, calls, handlers } = setup({ ok: false, reason: 'noPayee' });
    await flow.load();
    await flow.publish(handlers);
    expect(calls.status).toBe(2);
    expect(flow.get().rejected).toBeNull();
  });

  test('an already-sent replay clears the draft and leaves', async () => {
    const { flow, calls, seen, handlers } = setup({ ok: false, reason: 'alreadySent' });
    await flow.load();
    await flow.publish(handlers);
    expect(seen).toEqual(['alreadySent']);
    expect(calls.cleared).toBe(1);
  });
});
