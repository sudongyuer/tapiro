import type { LiveActivityPush } from './apns.ts';
import type { ApnsEnvironment } from './handler.ts';
import {
  FINAL_LINGER_MS,
  finalAt,
  liveActivityState,
  parseSubjects,
  staleAt,
  subjectLink,
  targetAt,
  type ContentState,
  type Subject,
} from './liveActivityContent.ts';

export const ATTRIBUTES_TYPE = 'TapiroActivityAttributes';

export type ActivityToken = { token: string; link: string; lastContent: ContentState | null };

export type LiveActivityDevice = {
  startToken: string | null;
  environment: ApnsEnvironment;
  language: string;
  timeZone: string;
  clock: 'h23' | 'h12';
  activities: ActivityToken[];
};

export type LiveActivityWork = {
  userId: string;
  version: number;
  urgent: boolean;
  subjects: unknown;
  started: { link: string; at: string }[];
  devices: LiveActivityDevice[];
};

export type PlannedRecord =
  | { kind: 'content'; token: string; content: ContentState }
  | { kind: 'ended'; token: string }
  | { kind: 'started'; token: string; link: string; content: ContentState };

export type PlannedPush = { push: LiveActivityPush; record: PlannedRecord };

const seconds = (ms: number) => Math.floor(ms / 1000);
const START_SETTLES_MS = 10 * 60_000;

function topSubject(subjects: Subject[]) {
  let top: { subject: Subject; at: number } | null = null;
  for (const subject of subjects) {
    const at = targetAt(subject);
    if (at === null) continue;
    const earlier =
      top === null ||
      at < top.at ||
      (at === top.at && subject.kind === 'bounty' && top.subject.kind === 'ride');
    if (earlier) top = { subject, at };
  }
  return top?.subject ?? null;
}

const sameContent = (a: ContentState | null, b: ContentState) =>
  a !== null && JSON.stringify(a) === JSON.stringify(b);

function withStale(aps: Record<string, unknown>, subject: Subject) {
  const stale = staleAt(subject);
  return stale === null ? aps : { ...aps, 'stale-date': seconds(stale) };
}

export function planLiveActivityWork(work: LiveActivityWork, now: number): PlannedPush[] {
  const { subjects, unreadable } = parseSubjects(work.subjects);
  const byLink = new Map(subjects.map((subject) => [subjectLink(subject), subject]));
  const started = new Set(work.started.map((entry) => entry.link));
  const attached = new Set(
    work.devices.flatMap((device) => device.activities.map((activity) => activity.link)),
  );
  // A push-started activity has no token until the kit attaches it; until then it still counts as running.
  const startPending = work.started.some(({ link, at }) => {
    const subject = byLink.get(link);
    const live = subject !== undefined && targetAt(subject) !== null;
    return live && !attached.has(link) && now - Date.parse(at) < START_SETTLES_MS;
  });
  const timestamp = seconds(now);
  const planned: PlannedPush[] = [];

  for (const device of work.devices) {
    const style = { language: device.language, timeZone: device.timeZone, clock: device.clock };
    const target = { environment: device.environment };
    let running = false;

    for (const activity of device.activities) {
      if (unreadable.has(activity.link)) {
        running = true;
        continue;
      }
      const subject = byLink.get(activity.link);
      const record = { kind: 'ended' as const, token: activity.token };
      if (!subject) {
        const aps: Record<string, unknown> = {
          timestamp,
          event: 'end',
          'dismissal-date': timestamp - 1,
        };
        if (activity.lastContent) aps['content-state'] = activity.lastContent;
        planned.push({
          push: { ...target, to: activity.token, priority: 10, payload: { aps } },
          record,
        });
        continue;
      }
      const state = liveActivityState(subject, style, now);
      const done = finalAt(subject);
      if (done !== null) {
        const aps = {
          timestamp,
          event: 'end',
          'content-state': state,
          'dismissal-date': Math.max(timestamp - 1, seconds(done + FINAL_LINGER_MS)),
        };
        planned.push({
          push: { ...target, to: activity.token, priority: 10, payload: { aps } },
          record,
        });
        continue;
      }
      running = true;
      if (sameContent(activity.lastContent, state)) continue;
      const aps = withStale({ timestamp, event: 'update', 'content-state': state }, subject);
      planned.push({
        push: { ...target, to: activity.token, priority: work.urgent ? 10 : 5, payload: { aps } },
        record: { kind: 'content', token: activity.token, content: state },
      });
    }

    if (running || startPending || !device.startToken) continue;
    const top = topSubject(subjects.filter((subject) => !started.has(subjectLink(subject))));
    if (!top) continue;
    const link = subjectLink(top);
    const state = liveActivityState(top, style, now);
    const aps = withStale(
      {
        timestamp,
        event: 'start',
        'content-state': state,
        'attributes-type': ATTRIBUTES_TYPE,
        attributes: { kind: top.kind, link },
        'input-push-token': 1,
        alert: { title: state.title, body: state.detail },
      },
      top,
    );
    planned.push({
      push: { ...target, to: device.startToken, priority: 10, payload: { aps } },
      record: { kind: 'started', token: device.startToken, link, content: state },
    });
  }
  return planned;
}
