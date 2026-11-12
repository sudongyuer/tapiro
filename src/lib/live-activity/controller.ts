import type {
  LiveActivityChangeResult,
  LiveActivityInfo,
  LiveActivityStartResult,
  LiveActivityState,
} from 'tapiro-kit';

import { liveActivityLink, type LiveActivitySubject } from './content';
import type { LiveActivityRead } from './parse';
import { keptStarted, planLiveActivities, type RunningActivity } from './plan';

export type LiveActivityKit = {
  enabled(): Promise<boolean>;
  list(): Promise<LiveActivityInfo[]>;
  start(
    kind: string,
    link: string | null,
    state: LiveActivityState,
  ): Promise<LiveActivityStartResult>;
  update(id: string, state: LiveActivityState): Promise<LiveActivityChangeResult>;
  end(
    id: string,
    state: LiveActivityState | null,
    dismissAfterSeconds: number,
  ): Promise<LiveActivityChangeResult>;
};

export type StartedLinks = { load(): string[]; save(links: readonly string[]): void };

export type LiveActivityDeps = {
  kit: LiveActivityKit;
  load: () => Promise<LiveActivityRead>;
  content: (subject: LiveActivitySubject, now: number) => LiveActivityState;
  started: StartedLinks;
  now: () => number;
  maxReadAgeMs?: number;
};

const RUNNING = new Set<LiveActivityInfo['state']>(['active', 'stale']);
const MAX_READ_AGE_MS = 150_000;

export function createLiveActivityController({
  kit,
  load,
  content,
  started,
  now,
  maxReadAgeMs = MAX_READ_AGE_MS,
}: LiveActivityDeps) {
  let read: (LiveActivityRead & { at: number }) | null = null;
  let generation = 0;
  let paused = false;
  let queue: Promise<void> = Promise.resolve();
  let queuedRefresh: Promise<void> | null = null;

  async function running(): Promise<RunningActivity[]> {
    const list = await kit.list();
    return list
      .filter((activity) => RUNNING.has(activity.state))
      .map(({ id, link }) => ({ id, link }));
  }

  async function reconcile(at: number) {
    if (read === null || at !== generation) return;
    const { subjects } = read;
    const unreadable = new Set(read.unreadable);
    const current = await running();
    const time = now();
    const links = new Set(started.load());
    const plan = planLiveActivities({
      running: current,
      subjects,
      started: links,
      unreadable,
      now: time,
    });
    for (const action of plan) {
      if (at !== generation) return;
      if (action.type === 'start') {
        const state = content(action.subject, time);
        const result = await kit.start(action.subject.kind, action.link, state);
        if (result.status !== 'ok') continue;
        links.add(action.link);
        started.save([...links]);
      } else if (action.type === 'update') {
        await kit.update(action.id, content(action.subject, time));
      } else {
        const state = action.subject ? content(action.subject, time) : null;
        if (state && action.dismissAfterSeconds > 0) await kit.update(action.id, state);
        await kit.end(action.id, state, action.dismissAfterSeconds);
      }
    }
    const subjectLinks = new Set(subjects.map(liveActivityLink));
    for (const { link } of current) if (link !== null && subjectLinks.has(link)) links.add(link);
    const kept = [...keptStarted(links, current, subjects, unreadable)];
    if (kept.join('\n') !== started.load().join('\n')) started.save(kept);
  }

  function serial(run: () => Promise<void>) {
    queue = queue.then(run).catch(() => undefined);
    return queue;
  }

  async function refresh(at: number) {
    if (paused || !(await kit.enabled())) return;
    try {
      const loaded = await load();
      if (at !== generation) return;
      read = { ...loaded, at: now() };
    } catch {
      return;
    }
    await reconcile(at);
  }

  function queueRefresh() {
    if (queuedRefresh) return queuedRefresh;
    const at = generation;
    const next = serial(() => {
      queuedRefresh = null;
      return refresh(at);
    });
    queuedRefresh = next;
    return next;
  }

  return {
    follow() {
      paused = false;
    },
    refresh: queueRefresh,
    tick() {
      if (read !== null && now() - read.at > maxReadAgeMs) return queueRefresh();
      const at = generation;
      return serial(() => reconcile(at));
    },
    signOut() {
      generation += 1;
      paused = true;
      read = null;
      return serial(async () => {
        const links = new Set(started.load());
        for (const activity of await running()) {
          if (activity.link !== null && links.has(activity.link))
            await kit.end(activity.id, null, 0);
        }
      });
    },
  };
}

export type LiveActivityController = ReturnType<typeof createLiveActivityController>;
