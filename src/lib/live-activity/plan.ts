import { FINAL_LINGER_SECONDS, liveActivityLink, type LiveActivitySubject } from './content';

export type RunningActivity = { id: string; link: string | null };

export type LiveActivityAction =
  | { type: 'start'; link: string; subject: LiveActivitySubject }
  | { type: 'update'; id: string; subject: LiveActivitySubject }
  | { type: 'end'; id: string; subject: LiveActivitySubject | null; dismissAfterSeconds: number };

export type LiveActivityPlanInput = {
  running: readonly RunningActivity[];
  subjects: readonly LiveActivitySubject[];
  started: ReadonlySet<string>;
  unreadable?: ReadonlySet<string>;
  now: number;
};

function finalAt(subject: LiveActivitySubject) {
  if (subject.phase === 'arrived') return subject.arrivedAt;
  if (subject.phase === 'departed') return subject.departedAt;
  return null;
}

function target(subject: LiveActivitySubject) {
  if (subject.phase === 'onTheWay') return subject.etaAt;
  if (subject.phase === 'meetup') return subject.departAt;
  return null;
}

export function topSubject(subjects: readonly LiveActivitySubject[]) {
  let top: { subject: LiveActivitySubject; at: number } | null = null;
  for (const subject of subjects) {
    const at = target(subject);
    if (at === null) continue;
    const earlier =
      top === null ||
      at < top.at ||
      (at === top.at && subject.kind === 'bounty' && top.subject.kind === 'ride');
    if (earlier) top = { subject, at };
  }
  return top?.subject ?? null;
}

function remainingLinger(subject: LiveActivitySubject, now: number) {
  const at = finalAt(subject);
  if (at === null) return 0;
  const left = Math.round(at / 1000 + FINAL_LINGER_SECONDS - now / 1000);
  return Math.min(FINAL_LINGER_SECONDS, Math.max(0, left));
}

export function planLiveActivities({
  running,
  subjects,
  started,
  unreadable = new Set(),
  now,
}: LiveActivityPlanInput): LiveActivityAction[] {
  const byLink = new Map(subjects.map((subject) => [liveActivityLink(subject), subject]));
  const actions: LiveActivityAction[] = [];
  const kept = new Set<string>();
  for (const activity of running) {
    const { link } = activity;
    if (link === null || (!started.has(link) && !byLink.has(link))) continue;
    if (unreadable.has(link)) {
      kept.add(link);
      continue;
    }
    const subject = byLink.get(link) ?? null;
    if (subject === null || kept.has(link)) {
      actions.push({ type: 'end', id: activity.id, subject: null, dismissAfterSeconds: 0 });
    } else if (finalAt(subject) !== null) {
      const linger = remainingLinger(subject, now);
      actions.push({ type: 'end', id: activity.id, subject, dismissAfterSeconds: linger });
    } else {
      kept.add(link);
      actions.push({ type: 'update', id: activity.id, subject });
    }
  }
  if (kept.size > 0) return actions;
  const top = topSubject(subjects.filter((subject) => !started.has(liveActivityLink(subject))));
  if (top !== null) actions.push({ type: 'start', link: liveActivityLink(top), subject: top });
  return actions;
}

export function keptStarted(
  started: ReadonlySet<string>,
  running: readonly RunningActivity[],
  subjects: readonly LiveActivitySubject[],
  unreadable: ReadonlySet<string> = new Set(),
) {
  const live = new Set([
    ...subjects.map(liveActivityLink),
    ...unreadable,
    ...running.flatMap((activity) => (activity.link === null ? [] : [activity.link])),
  ]);
  return new Set([...started].filter((link) => live.has(link)));
}
