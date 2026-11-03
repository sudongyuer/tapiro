import { createStore } from '@/lib/store';

import { matches } from './signal';
import type {
  ChannelStatus,
  LiveConnection,
  LiveHandler,
  LiveSignal,
  LiveTransport,
} from './types';

export const OFFLINE_GRACE_MS = 3_000;
export const REOPEN_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

type Timers = {
  set: (run: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const SYSTEM_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createLive({
  transport,
  timers = SYSTEM_TIMERS,
  graceMs = OFFLINE_GRACE_MS,
  backoffMs = REOPEN_BACKOFF_MS,
}: {
  transport: LiveTransport;
  timers?: Timers;
  graceMs?: number;
  backoffMs?: readonly number[];
}) {
  const handlers = new Set<{ prefixes: readonly string[]; handler: LiveHandler }>();
  const connection = createStore<LiveConnection>('idle');
  const offline = createStore(false);
  let userId: string | null = null;
  let session = 0;
  let close: (() => void) | null = null;
  let dropped = false;
  let attempt = 0;
  let reopenTimer: unknown = null;
  let graceTimer: unknown = null;

  function dispatch(signal: LiveSignal | null) {
    for (const entry of [...handlers]) {
      if (!matches(signal, entry.prefixes)) continue;
      try {
        entry.handler(signal);
      } catch {}
    }
  }

  function clearTimer(handle: unknown) {
    if (handle !== null) timers.clear(handle);
  }

  function setConnection(next: LiveConnection) {
    if (connection.get() === next) return;
    connection.set(next);
    if (next === 'offline') {
      clearTimer(graceTimer);
      graceTimer = timers.set(() => {
        graceTimer = null;
        if (connection.get() === 'offline') offline.set(true);
      }, graceMs);
      return;
    }
    clearTimer(graceTimer);
    graceTimer = null;
    offline.set(false);
  }

  function shut() {
    session += 1;
    clearTimer(reopenTimer);
    reopenTimer = null;
    const closing = close;
    close = null;
    closing?.();
  }

  function open() {
    if (!userId) return;
    shut();
    const mine = session;
    close = transport.open(userId, {
      signal: (signal) => {
        if (mine === session) dispatch(signal);
      },
      status: (status) => {
        if (mine === session) answer(status);
      },
    });
  }

  function reopenLater() {
    shut();
    const wait = backoffMs[Math.min(attempt, backoffMs.length - 1)];
    attempt += 1;
    reopenTimer = timers.set(() => {
      reopenTimer = null;
      open();
    }, wait);
  }

  function answer(status: ChannelStatus) {
    if (status === 'joined') {
      attempt = 0;
      setConnection('live');
      if (dropped) {
        dropped = false;
        dispatch(null);
      }
      return;
    }
    dropped = true;
    setConnection('offline');
    if (status === 'closed') reopenLater();
  }

  function stop() {
    shut();
    userId = null;
    dropped = false;
    attempt = 0;
    setConnection('idle');
  }

  return {
    connection,
    offline,
    follow(next: string | null) {
      if (next === userId) return;
      stop();
      if (!next) return;
      userId = next;
      setConnection('connecting');
      open();
    },
    stop,
    foreground() {
      if (!userId || connection.get() !== 'offline' || reopenTimer === null) return;
      attempt = 0;
      open();
    },
    on(prefixes: readonly string[], handler: LiveHandler) {
      const entry = { prefixes, handler };
      handlers.add(entry);
      return () => {
        handlers.delete(entry);
      };
    },
  };
}

export type Live = ReturnType<typeof createLive>;
