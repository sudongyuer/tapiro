import { describe, expect, test } from 'bun:test';
import type { LiveActivityInfo, LiveActivityState } from 'tapiro-kit';

import type { LiveActivitySubject } from './content';
import { createLiveActivityController, type LiveActivityKit } from './controller';

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 12, 5, 8);
const B1 = 'tapiro://bounty/status/b1';

const onTheWay = (etaIn: number): LiveActivitySubject => ({
  kind: 'bounty',
  id: 'b1',
  phase: 'onTheWay',
  helper: '小林',
  place: '图书馆',
  task: '帮取快递',
  leftAt: NOW - 6 * MINUTE,
  etaAt: NOW + etaIn * MINUTE,
});

const arrived: LiveActivitySubject = {
  kind: 'bounty',
  id: 'b1',
  phase: 'arrived',
  helper: '小林',
  place: '图书馆',
  leftAt: NOW - 6 * MINUTE,
  arrivedAt: NOW,
};

function content(subject: LiveActivitySubject): LiveActivityState {
  const minutes = subject.phase === 'onTheWay' ? (subject.etaAt - NOW) / MINUTE : undefined;
  return {
    title: subject.phase,
    staleTitle: subject.phase,
    detail: '',
    minutes,
    unit: '分',
    progress: 0,
    startLabel: '',
    endLabel: '',
    staleNote: '',
  };
}

type Call = [string, ...unknown[]];

function fakeKit(enabled = true) {
  const activities: LiveActivityInfo[] = [];
  const calls: Call[] = [];
  let next = 0;
  const kit: LiveActivityKit = {
    enabled: async () => enabled,
    list: async () => activities.map((activity) => ({ ...activity })),
    async start(kind, link, state) {
      calls.push(['start', link, state.title]);
      const id = `a${++next}`;
      activities.push({ id, kind, link, state: 'active' });
      return { status: 'ok', id };
    },
    async update(id, state) {
      calls.push(['update', id, state.minutes]);
      return { status: 'ok' };
    },
    async end(id, state, dismissAfterSeconds) {
      calls.push(['end', id, state?.title ?? null, dismissAfterSeconds]);
      const activity = activities.find((item) => item.id === id);
      if (activity) activity.state = dismissAfterSeconds === 0 ? 'dismissed' : 'ended';
      return { status: 'ok' };
    },
  };
  return { kit, calls, activities };
}

function memoryLinks(initial: string[] = []) {
  let links = initial;
  return {
    load: () => links,
    save: (next: readonly string[]) => {
      links = [...next];
    },
    get: () => links,
  };
}

function setup(
  subjects: { current: LiveActivitySubject[] | Error },
  options?: { enabled?: boolean },
) {
  const fake = fakeKit(options?.enabled);
  const started = memoryLinks();
  const loads: number[] = [];
  const clock = { now: NOW };
  const controller = createLiveActivityController({
    kit: fake.kit,
    load: async () => {
      loads.push(1);
      if (subjects.current instanceof Error) throw subjects.current;
      return { subjects: subjects.current, unreadable: [] };
    },
    content,
    started,
    now: () => clock.now,
    maxReadAgeMs: 150_000,
  });
  return { ...fake, started, loads, clock, controller };
}

describe('live activity controller', () => {
  test('en_route starts once, an ETA change updates, and 完成 shows the final step then ends with the 15-minute linger', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, calls, started } = setup(subjects);
    await controller.refresh();
    await controller.refresh();
    subjects.current = [onTheWay(9)];
    await controller.refresh();
    subjects.current = [arrived];
    await controller.refresh();
    await controller.refresh();
    expect(calls).toEqual([
      ['start', B1, 'onTheWay'],
      ['update', 'a1', 6],
      ['update', 'a1', 9],
      ['update', 'a1', undefined],
      ['end', 'a1', 'arrived', 900],
    ]);
    expect(started.get()).toEqual([B1]);
  });

  test('a cancel ends at once and is never restarted', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, calls, started } = setup(subjects);
    await controller.refresh();
    subjects.current = [];
    await controller.refresh();
    await controller.refresh();
    expect(calls).toEqual([
      ['start', B1, 'onTheWay'],
      ['end', 'a1', null, 0],
    ]);
    expect(started.get()).toEqual([]);
  });

  test('an activity the user dismissed is not started again while its item is live', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, calls, activities } = setup(subjects);
    await controller.refresh();
    activities[0].state = 'dismissed';
    await controller.refresh();
    expect(calls).toEqual([['start', B1, 'onTheWay']]);
  });

  test('after a relaunch the running activity is found with list and updated, not started again', async () => {
    const subjects = { current: [onTheWay(4)] };
    const fake = fakeKit();
    fake.activities.push({ id: 'old', kind: 'bounty', link: B1, state: 'active' });
    const started = memoryLinks([B1]);
    const controller = createLiveActivityController({
      kit: fake.kit,
      load: async () => ({ subjects: subjects.current, unreadable: [] }),
      content,
      started,
      now: () => NOW,
    });
    await controller.refresh();
    expect(fake.calls).toEqual([['update', 'old', 4]]);
  });

  test('a failed read leaves the activity as it is: no end, no start, no update', async () => {
    const subjects: { current: LiveActivitySubject[] | Error } = { current: [onTheWay(6)] };
    const { controller, calls } = setup(subjects);
    await controller.refresh();
    subjects.current = new Error('offline');
    await controller.refresh();
    expect(calls).toEqual([['start', B1, 'onTheWay']]);
  });

  test('the minute tick redraws from the last read without reading again', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, calls, loads } = setup(subjects);
    await controller.tick();
    await controller.refresh();
    await controller.tick();
    expect(loads.length).toBe(1);
    expect(calls).toEqual([
      ['start', B1, 'onTheWay'],
      ['update', 'a1', 6],
    ]);
  });

  test('with Live Activities off nothing is read or started', async () => {
    const { controller, calls, loads } = setup({ current: [onTheWay(6)] }, { enabled: false });
    await controller.refresh();
    expect(loads.length).toBe(0);
    expect(calls).toEqual([]);
  });

  test('sign out ends its own activities at once and pauses until the next user; a refresh queued before does nothing', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, calls, started, activities } = setup(subjects);
    activities.push({
      id: 'dbg',
      kind: 'bounty',
      link: 'tapiro://bounty/status/debug',
      state: 'active',
    });
    await controller.refresh();
    const queued = controller.refresh();
    await controller.signOut();
    await queued;
    await controller.tick();
    await controller.refresh();
    expect(calls).toEqual([
      ['start', B1, 'onTheWay'],
      ['end', 'a1', null, 0],
    ]);
    expect(started.get()).toEqual([B1]);
    controller.follow();
    await controller.refresh();
    expect(calls.length).toBe(2);
  });

  test('a burst of signals reads once', async () => {
    const { controller, loads } = setup({ current: [onTheWay(6)] });
    await Promise.all([controller.refresh(), controller.refresh(), controller.refresh()]);
    expect(loads.length).toBe(1);
  });

  test('a tick on a read older than its limit reads again; if that fails nothing is redrawn', async () => {
    const subjects: { current: LiveActivitySubject[] | Error } = { current: [onTheWay(6)] };
    const { controller, calls, loads, clock } = setup(subjects);
    await controller.refresh();
    subjects.current = new Error('offline');
    clock.now += 3 * MINUTE;
    await controller.tick();
    await controller.tick();
    expect(loads.length).toBe(3);
    expect(calls).toEqual([['start', B1, 'onTheWay']]);
  });

  test('a running activity for a listed item that was never recorded is adopted, not started twice', async () => {
    const subjects = { current: [onTheWay(4)] };
    const { controller, calls, started, activities } = setup(subjects);
    activities.push({ id: 'lost', kind: 'bounty', link: B1, state: 'active' });
    await controller.refresh();
    expect(calls).toEqual([['update', 'lost', 4]]);
    expect(started.get()).toEqual([B1]);
  });

  test('a start the system refuses (app in the background) is not recorded, so the next refresh tries again', async () => {
    const subjects = { current: [onTheWay(6)] };
    const { controller, kit, calls, started } = setup(subjects);
    const start = kit.start;
    kit.start = async (kind, link, state) => {
      calls.push(['refused', link]);
      return { status: 'failed', code: 'disabled' };
    };
    await controller.refresh();
    expect(started.get()).toEqual([]);
    kit.start = start;
    await controller.refresh();
    expect(calls).toEqual([
      ['refused', B1],
      ['start', B1, 'onTheWay'],
    ]);
  });
});
