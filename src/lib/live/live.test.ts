import { describe, expect, test } from 'bun:test';

import { createLive } from './live';
import { toSignal } from './signal';
import type { ChannelEvents, LiveSignal, LiveTransport } from './types';
import { createVerifyTransport, parseLiveScript } from './verifyTransport';

function fakeTimers() {
  let now = 0;
  let next = 1;
  const pending = new Map<number, { at: number; run: () => void }>();
  return {
    set(run: () => void, ms: number) {
      const id = next++;
      pending.set(id, { at: now + ms, run });
      return id;
    },
    clear(handle: unknown) {
      pending.delete(handle as number);
    },
    advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const due = [...pending.entries()]
          .filter(([, timer]) => timer.at <= until)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].run();
      }
      now = until;
    },
  };
}

function fakeTransport() {
  const opened: { userId: string; events: ChannelEvents; closed: boolean }[] = [];
  const transport: LiveTransport = {
    open(userId, events) {
      const entry = { userId, events, closed: false };
      opened.push(entry);
      return () => {
        entry.closed = true;
      };
    },
  };
  return { transport, opened, current: () => opened[opened.length - 1] };
}

const signal = (kind: string, id = 'b1'): LiveSignal => ({ kind, id, at: null });

function setup() {
  const timers = fakeTimers();
  const channel = fakeTransport();
  const live = createLive({ transport: channel.transport, timers });
  return { timers, channel, live };
}

describe('dispatch by kind', () => {
  test('a signal reaches only the handlers registered for its prefix', () => {
    const { channel, live } = setup();
    const bounty: (LiveSignal | null)[] = [];
    const payment: (LiveSignal | null)[] = [];
    const both: (LiveSignal | null)[] = [];
    live.on(['bounty.'], (s) => bounty.push(s));
    live.on(['payment.'], (s) => payment.push(s));
    live.on(['bounty.', 'payment.'], (s) => both.push(s));
    live.follow('u1');
    channel.current().events.status('joined');
    channel.current().events.signal(signal('bounty.applied'));
    channel.current().events.signal(signal('payment.marked_paid', 'p1'));
    channel.current().events.signal(signal('ride.arrival', 'r1'));
    expect(bounty.map((s) => s?.kind)).toEqual(['bounty.applied']);
    expect(payment.map((s) => s?.kind)).toEqual(['payment.marked_paid']);
    expect(both.map((s) => s?.kind)).toEqual(['bounty.applied', 'payment.marked_paid']);
  });

  test('a removed handler and a throwing handler do not stop the others', () => {
    const { channel, live } = setup();
    const seen: string[] = [];
    const off = live.on(['bounty.'], () => seen.push('removed'));
    live.on(['bounty.'], () => {
      throw new Error('boom');
    });
    live.on(['bounty.'], (s) => seen.push(s?.kind ?? 'resync'));
    off();
    live.follow('u1');
    channel.current().events.signal(signal('bounty.selected'));
    expect(seen).toEqual(['bounty.selected']);
  });

  test('one channel per user, closed on sign-out and on a user switch', () => {
    const { channel, live } = setup();
    live.follow('u1');
    live.follow('u1');
    expect(channel.opened.map((o) => o.userId)).toEqual(['u1']);
    live.follow('u2');
    expect(channel.opened[0].closed).toBe(true);
    live.follow(null);
    expect(channel.opened[1].closed).toBe(true);
    expect(live.connection.get()).toBe('idle');
  });

  test('a closed session never dispatches', () => {
    const { channel, live } = setup();
    const seen: string[] = [];
    live.on(['bounty.'], (s) => seen.push(s?.kind ?? 'resync'));
    live.follow('u1');
    const old = channel.current().events;
    live.follow('u2');
    old.signal(signal('bounty.applied'));
    old.status('joined');
    expect(seen).toEqual([]);
    expect(live.connection.get()).toBe('connecting');
  });
});

describe('reconnect refetch', () => {
  test('the first join refetches nothing; a join after a drop refetches every handler once', () => {
    const { channel, live } = setup();
    const seen: (LiveSignal | null)[] = [];
    live.on(['bounty.'], (s) => seen.push(s));
    live.on(['ride.'], (s) => seen.push(s));
    live.follow('u1');
    channel.current().events.status('joined');
    expect(seen).toEqual([]);
    channel.current().events.status('error');
    channel.current().events.status('error');
    channel.current().events.status('joined');
    expect(seen).toEqual([null, null]);
    channel.current().events.status('joined');
    expect(seen).toEqual([null, null]);
  });

  test('a closed channel reopens with backoff and refetches once it joins', () => {
    const { timers, channel, live } = setup();
    const seen: (LiveSignal | null)[] = [];
    live.on(['payment.'], (s) => seen.push(s));
    live.follow('u1');
    channel.current().events.status('joined');
    channel.current().events.status('closed');
    expect(channel.opened[0].closed).toBe(true);
    timers.advance(999);
    expect(channel.opened).toHaveLength(1);
    timers.advance(1);
    expect(channel.opened).toHaveLength(2);
    channel.current().events.status('closed');
    timers.advance(1_999);
    expect(channel.opened).toHaveLength(2);
    timers.advance(1);
    expect(channel.opened).toHaveLength(3);
    channel.current().events.status('joined');
    expect(seen).toEqual([null]);
  });

  test('returning to the foreground reopens a closed channel at once', () => {
    const { channel, live } = setup();
    live.follow('u1');
    channel.current().events.status('closed');
    live.foreground();
    expect(channel.opened).toHaveLength(2);
    live.foreground();
    expect(channel.opened).toHaveLength(2);
  });
});

describe('disconnected line', () => {
  test('shows after the grace period offline and hides when the channel joins', () => {
    const { timers, channel, live } = setup();
    live.follow('u1');
    timers.advance(10_000);
    expect(live.offline.get()).toBe(false);
    channel.current().events.status('error');
    timers.advance(2_999);
    expect(live.offline.get()).toBe(false);
    timers.advance(1);
    expect(live.offline.get()).toBe(true);
    channel.current().events.status('joined');
    expect(live.offline.get()).toBe(false);
  });

  test('a drop shorter than the grace period never shows the line', () => {
    const { timers, channel, live } = setup();
    live.follow('u1');
    channel.current().events.status('error');
    timers.advance(1_500);
    channel.current().events.status('joined');
    timers.advance(10_000);
    expect(live.offline.get()).toBe(false);
  });

  test('signing out hides the line', () => {
    const { timers, channel, live } = setup();
    live.follow('u1');
    channel.current().events.status('error');
    timers.advance(5_000);
    expect(live.offline.get()).toBe(true);
    live.follow(null);
    expect(live.offline.get()).toBe(false);
  });
});

describe('signals', () => {
  test('reads the broadcast payload and rejects malformed ones', () => {
    expect(
      toSignal({ event: 'bounty.applied', payload: { kind: 'bounty.applied', id: 'b1', at: 'x' } }),
    ).toEqual({ kind: 'bounty.applied', id: 'b1', at: 'x' });
    expect(toSignal({ payload: { kind: 'bounty.applied' } })).toBeNull();
    expect(toSignal({ payload: { kind: 'Bounty', id: 'b1' } })).toBeNull();
    expect(toSignal(null)).toBeNull();
  });
});

describe('verify emitter', () => {
  test('parses a script and plays it once from the first open', () => {
    const steps = parseLiveScript('6000:bounty.applied:fixture-bounty-01,2000:drop,4000:back,x:y');
    expect(steps).toEqual([
      { at: 2000, status: 'error' },
      { at: 4000, status: 'joined' },
      { at: 6000, signal: { kind: 'bounty.applied', id: 'fixture-bounty-01', at: null } },
    ]);
    const timers = fakeTimers();
    const delivered: string[][] = [];
    const live = createLive({
      transport: createVerifyTransport(steps, { timers, onDelivered: (l) => delivered.push(l) }),
      timers,
    });
    const seen: (string | null)[] = [];
    live.on(['bounty.'], (s) => seen.push(s?.kind ?? null));
    live.follow('u1');
    timers.advance(0);
    expect(live.connection.get()).toBe('live');
    timers.advance(2_000);
    expect(live.connection.get()).toBe('offline');
    timers.advance(2_000);
    expect(seen).toEqual([null]);
    timers.advance(2_000);
    expect(seen).toEqual([null, 'bounty.applied']);
    expect(delivered.at(-1)).toEqual(['drop', 'back', 'bounty.applied:fixture-bounty-01']);
  });
});
