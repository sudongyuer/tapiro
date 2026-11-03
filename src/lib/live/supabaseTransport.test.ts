import { describe, expect, test } from 'bun:test';

import { createSupabaseTransport, type LiveClient } from './supabaseTransport';
import type { ChannelStatus, LiveSignal } from './types';

type Listener = (message: unknown) => void;

function fakeClient(session: { access_token: string } | null = { access_token: 'jwt-1' }) {
  const log: string[] = [];
  let release: () => void = () => {};
  const removal = new Promise<void>((resolve) => (release = resolve));
  const channels: { topic: string; listener: Listener | null; status: (s: string) => void }[] = [];
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    realtime: {
      setAuth: async (token: string) => {
        log.push(`setAuth ${token}`);
      },
    },
    channel(topic: string, options: { config: { private: boolean } }) {
      log.push(`channel ${topic} private=${options.config.private}`);
      const entry = { topic, listener: null as Listener | null, status: (_: string) => {} };
      channels.push(entry);
      const chain = {
        on(_type: string, filter: { event: string }, listener: Listener) {
          log.push(`on ${filter.event}`);
          entry.listener = listener;
          return chain;
        },
        subscribe(callback: (status: string) => void) {
          log.push('subscribe');
          entry.status = callback;
          return chain;
        },
      };
      return chain;
    },
    removeChannel() {
      log.push('removeChannel');
      return removal;
    },
  };
  return {
    client: client as unknown as LiveClient,
    log,
    channels,
    finishRemoval: () => release(),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function open(client: LiveClient, userId = 'u1') {
  const signals: LiveSignal[] = [];
  const statuses: ChannelStatus[] = [];
  const close = createSupabaseTransport(client).open(userId, {
    signal: (s) => signals.push(s),
    status: (s) => statuses.push(s),
  });
  return { signals, statuses, close };
}

describe('supabase transport', () => {
  test('sets the session token before it joins the private user topic', async () => {
    const fake = fakeClient();
    open(fake.client);
    await settle();
    expect(fake.log).toEqual([
      'setAuth jwt-1',
      'channel user:u1 private=true',
      'on *',
      'subscribe',
    ]);
  });

  test('maps channel statuses and broadcast payloads', async () => {
    const fake = fakeClient();
    const { signals, statuses } = open(fake.client);
    await settle();
    const channel = fake.channels[0];
    for (const status of ['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED', 'JOINING']) {
      channel.status(status);
    }
    channel.listener?.({
      type: 'broadcast',
      event: 'bounty.applied',
      payload: { kind: 'bounty.applied', id: 'b1', at: '2026-11-03T00:00:00Z' },
    });
    channel.listener?.({ type: 'broadcast', event: 'x', payload: { nope: true } });
    expect(statuses).toEqual(['joined', 'error', 'error', 'closed']);
    expect(signals).toEqual([{ kind: 'bounty.applied', id: 'b1', at: '2026-11-03T00:00:00Z' }]);
  });

  test('without a session it reports closed and never joins', async () => {
    const fake = fakeClient(null);
    const { statuses } = open(fake.client);
    await settle();
    expect(statuses).toEqual(['closed']);
    expect(fake.channels).toHaveLength(0);
  });

  test('closing removes the channel and silences it', async () => {
    const fake = fakeClient();
    const { statuses, signals, close } = open(fake.client);
    await settle();
    close();
    fake.channels[0].status('CLOSED');
    fake.channels[0].listener?.({ payload: { kind: 'bounty.applied', id: 'b1' } });
    expect(fake.log).toContain('removeChannel');
    expect(statuses).toEqual([]);
    expect(signals).toEqual([]);
  });

  test('a close before the join finishes never subscribes', async () => {
    const fake = fakeClient();
    const { close } = open(fake.client);
    close();
    await settle();
    expect(fake.channels).toHaveLength(0);
  });

  test('a reopen waits until the previous channel has left', async () => {
    const fake = fakeClient();
    const transport = createSupabaseTransport(fake.client);
    const events = { signal: () => {}, status: () => {} };
    const close = transport.open('u1', events);
    await settle();
    close();
    transport.open('u1', events);
    await settle();
    expect(fake.channels).toHaveLength(1);
    fake.finishRemoval();
    await settle();
    expect(fake.channels).toHaveLength(2);
  });
});
