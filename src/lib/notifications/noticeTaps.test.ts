import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { followNoticeTaps, verifyNoticeTaps, type NoticeTap, type NoticeTaps } from './noticeTaps';
import { noticeRoute, type NoticeRoute } from './routes';

const migrations = join(import.meta.dir, '../../../supabase/migrations');

function eventKinds() {
  const sql = readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(join(migrations, name), 'utf8'))
    .join('\n');
  return [...sql.matchAll(/insert into private\.event_kinds \(kind, push\)\s+values([^;]+);/g)]
    .flatMap((insert) => [...insert[1].matchAll(/\('([a-z]+\.[a-z_]+)', (?:true|false)\)/g)])
    .map((match) => match[1])
    .sort();
}

function fakeTaps(cold: NoticeTap | null) {
  let listener: ((tap: NoticeTap) => void) | null = null;
  let last = cold;
  let clears = 0;
  const taps: NoticeTaps = {
    last: async () => last,
    listen(on) {
      listener = on;
      return () => {
        listener = null;
      };
    },
    clear() {
      clears += 1;
      last = null;
    },
  };
  return {
    taps,
    tap: (value: NoticeTap) => listener?.(value),
    clears: () => clears,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const EXPECTED: Record<string, string> = {
  'bounty.applied': '/bounty/applicants/[id]',
  'bounty.withdrawn': '/bounty/applicants/[id]',
  'bounty.selected': '/bounty/status/[id]',
  'bounty.not_selected': '/bounty/[id]',
  'bounty.started': '/bounty/status/[id]',
  'bounty.eta_changed': '/bounty/status/[id]',
  'bounty.completed': '/bounty/status/[id]',
  'bounty.issue': '/bounty/status/[id]',
  'bounty.cancelled': '/bounty/[id]',
  'bounty.expired': '/bounty/[id]',
  'bounty.confirmed': '/bounty/status/[id]',
};

function expected(kind: string, id: string): NoticeRoute {
  if (kind.startsWith('chat.')) return { pathname: '/messages/[thread]', params: { thread: id } };
  const pathname = EXPECTED[kind] ?? (kind.startsWith('payment.') ? '/pay/[id]' : '/ride/[id]');
  return { pathname, params: { id } } as NoticeRoute;
}

describe('tap routing', () => {
  const kinds = eventKinds();

  test('the migrations declare the bounty, payment, ride and chat kinds', () => {
    expect(kinds).toContain('chat.message');
    expect(kinds.length).toBeGreaterThan(35);
    expect(kinds.filter((kind) => kind.startsWith('bounty.')).sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
  });

  for (const kind of kinds) {
    test(`${kind} routes on a cold start`, async () => {
      const { taps, clears } = fakeTaps({ key: `cold:${kind}`, data: { kind, id: 'x1' } });
      const opened: NoticeRoute[] = [];
      followNoticeTaps(taps, new Set(), (route) => opened.push(route));
      await settle();
      expect(opened).toEqual([expected(kind, 'x1')]);
      expect(clears()).toBe(1);
    });

    test(`${kind} routes while running`, async () => {
      const { taps, tap } = fakeTaps(null);
      const opened: NoticeRoute[] = [];
      followNoticeTaps(taps, new Set(), (route) => opened.push(route));
      await settle();
      expect(opened).toEqual([]);
      tap({ key: `warm:${kind}`, data: { kind, id: 'x2' } });
      expect(opened).toEqual([expected(kind, 'x2')]);
    });
  }

  test('the same response is routed once, across a remount too', async () => {
    const cold = { key: 'k1', data: { kind: 'bounty.applied', id: 'b1' } };
    const handled = new Set<string>();
    const first = fakeTaps(cold);
    const opened: NoticeRoute[] = [];
    const stop = followNoticeTaps(first.taps, handled, (route) => opened.push(route));
    await settle();
    first.tap(cold);
    stop();
    followNoticeTaps(fakeTaps(cold).taps, handled, (route) => opened.push(route));
    await settle();
    expect(opened).toHaveLength(1);
  });

  test('unknown kinds and malformed data open nothing', async () => {
    const { taps, tap } = fakeTaps(null);
    const opened: NoticeRoute[] = [];
    followNoticeTaps(taps, new Set(), (route) => opened.push(route));
    tap({ key: 'a', data: { kind: 'later.kind', id: 't1' } });
    tap({ key: 'b', data: { kind: 'bounty.applied' } });
    tap({ key: 'c', data: null });
    expect(opened).toEqual([]);
    expect(noticeRoute({ kind: 'ride.reminder', id: 'r1' })?.pathname).toBe('/ride/[id]');
  });

  test('a stopped router ignores a late cold response', async () => {
    const { taps } = fakeTaps({ key: 'k', data: { kind: 'payment.settled', id: 'p1' } });
    const opened: NoticeRoute[] = [];
    followNoticeTaps(taps, new Set(), (route) => opened.push(route))();
    await settle();
    expect(opened).toEqual([]);
  });

  test('a tap while signed out is cleared and not replayed after the next sign-in', async () => {
    const handled = new Set<string>();
    const cold = { key: 'k-out', data: { kind: 'bounty.applied', id: 'b1' } };
    const signedOut = fakeTaps(cold);
    const stop = followNoticeTaps(signedOut.taps, handled, null);
    await settle();
    signedOut.tap({ key: 'k-out-2', data: { kind: 'payment.settled', id: 'p1' } });
    stop();
    expect(signedOut.clears()).toBe(2);
    const opened: NoticeRoute[] = [];
    followNoticeTaps(fakeTaps(cold).taps, handled, (route) => opened.push(route));
    await settle();
    expect(opened).toEqual([]);
  });

  test('the verify tap is a cold start that is read once', async () => {
    const taps = verifyNoticeTaps('bounty.selected:fixture-bounty-01');
    const opened: NoticeRoute[] = [];
    followNoticeTaps(taps, new Set(), (route) => opened.push(route));
    await settle();
    followNoticeTaps(taps, new Set(), (route) => opened.push(route));
    await settle();
    expect(opened).toEqual([
      { pathname: '/bounty/status/[id]', params: { id: 'fixture-bounty-01' } },
    ]);
  });
});
