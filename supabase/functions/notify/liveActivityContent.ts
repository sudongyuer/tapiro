import { liveActivityCopy, type LiveActivityCopy } from './liveActivityCopy.ts';

const MINUTE = 60_000;
const ETA_GRACE_MS = 5 * MINUTE;
export const FINAL_LINGER_MS = 15 * MINUTE;

type Place = { name: string; home: boolean };

export type Subject =
  | {
      kind: 'bounty';
      id: string;
      helper: string;
      place: string | null;
      phase: 'onTheWay';
      task: string;
      leftAt: number;
      etaAt: number;
    }
  | {
      kind: 'bounty';
      id: string;
      helper: string;
      place: string | null;
      phase: 'arrived';
      leftAt: number;
      arrivedAt: number;
    }
  | {
      kind: 'ride';
      id: string;
      start: Place;
      phase: 'meetup';
      gatherAt: number;
      departAt: number;
      arrived: number;
      total: number;
    }
  | {
      kind: 'ride';
      id: string;
      start: Place;
      phase: 'departed';
      gatherAt: number;
      departedAt: number;
      aboard: number;
    };

export type ContentState = {
  title: string;
  staleTitle: string;
  detail: string;
  minutes: number | null;
  unit: string;
  progress: number;
  startLabel: string;
  endLabel: string;
  staleNote: string;
};

export type DeviceStyle = { language: string; timeZone: string; clock: 'h23' | 'h12' };

export function subjectLink(subject: Pick<Subject, 'kind' | 'id'>) {
  return subject.kind === 'bounty'
    ? `tapiro://bounty/status/${subject.id}`
    : `tapiro://ride/${subject.id}`;
}

type Row = Record<string, unknown>;

function time(row: Row, key: string) {
  const parsed = typeof row[key] === 'string' ? Date.parse(row[key] as string) : NaN;
  if (Number.isNaN(parsed)) throw new Error(key);
  return parsed;
}

function text(row: Row, key: string) {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(key);
  return value;
}

function count(row: Row, key: string) {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(key);
  return value;
}

function parseOne(row: Row): Subject {
  if (row.kind === 'bounty') {
    const base = {
      kind: 'bounty' as const,
      id: text(row, 'id'),
      helper: text(row, 'helper'),
      place: typeof row.place === 'string' && row.place.length > 0 ? row.place : null,
      leftAt: time(row, 'leftAt'),
    };
    if (row.phase === 'onTheWay') {
      return { ...base, phase: 'onTheWay', task: text(row, 'task'), etaAt: time(row, 'etaAt') };
    }
    if (row.phase === 'arrived')
      return { ...base, phase: 'arrived', arrivedAt: time(row, 'arrivedAt') };
  }
  if (row.kind === 'ride') {
    const base = {
      kind: 'ride' as const,
      id: text(row, 'id'),
      start: { name: text(row, 'startName'), home: row.startHome === true },
      gatherAt: time(row, 'gatherAt'),
    };
    if (row.phase === 'meetup') {
      return {
        ...base,
        phase: 'meetup',
        departAt: time(row, 'departAt'),
        arrived: count(row, 'arrived'),
        total: count(row, 'total'),
      };
    }
    if (row.phase === 'departed') {
      return {
        ...base,
        phase: 'departed',
        departedAt: time(row, 'departedAt'),
        aboard: count(row, 'aboard'),
      };
    }
  }
  throw new Error('phase');
}

export type SubjectRead = { subjects: Subject[]; unreadable: Set<string> };

export function parseSubjects(value: unknown): SubjectRead {
  const read: SubjectRead = { subjects: [], unreadable: new Set() };
  if (!Array.isArray(value)) return read;
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Row;
    try {
      read.subjects.push(parseOne(row));
    } catch {
      if ((row.kind === 'bounty' || row.kind === 'ride') && typeof row.id === 'string') {
        read.unreadable.add(subjectLink({ kind: row.kind, id: row.id }));
      }
    }
  }
  return read;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function clockFor(style: DeviceStyle) {
  if (style.clock === 'h23') {
    const format = new Intl.DateTimeFormat('en-GB', {
      timeZone: style.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    return (at: number) => {
      const parts = Object.fromEntries(
        format.formatToParts(at).map((part) => [part.type, part.value]),
      );
      return `${pad(Number(parts.hour))}:${pad(Number(parts.minute))}`;
    };
  }
  const format = new Intl.DateTimeFormat(style.language, {
    timeZone: style.timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  });
  return (at: number) => format.format(at);
}

const minutesUntil = (target: number, now: number) =>
  Math.max(1, Math.ceil((target - now) / MINUTE));

function fraction(from: number, to: number, now: number) {
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (now - from) / (to - from)));
}

const startName = (start: Place, copy: LiveActivityCopy) =>
  start.home ? copy.line('homeStart') : start.name;

export function finalAt(subject: Subject) {
  if (subject.phase === 'arrived') return subject.arrivedAt;
  if (subject.phase === 'departed') return subject.departedAt;
  return null;
}

export function targetAt(subject: Subject) {
  if (subject.phase === 'onTheWay') return subject.etaAt;
  if (subject.phase === 'meetup') return subject.departAt;
  return null;
}

export function staleAt(subject: Subject) {
  if (subject.phase === 'onTheWay') return subject.etaAt + ETA_GRACE_MS;
  if (subject.phase === 'meetup') return subject.departAt;
  return null;
}

export function liveActivityState(subject: Subject, style: DeviceStyle, now: number): ContentState {
  const copy = liveActivityCopy(style.language);
  const clock = clockFor(style);
  const common = { unit: copy.line('unit'), staleNote: copy.line('stale') };
  switch (subject.phase) {
    case 'onTheWay': {
      const minutes = minutesUntil(subject.etaAt, now);
      return {
        ...common,
        title: copy.line('bounty.onTheWay', { name: subject.helper, count: minutes }),
        staleTitle: copy.line('bounty.onTheWayStale', { name: subject.helper }),
        detail: subject.place
          ? copy.line('pair', { first: subject.place, second: subject.task })
          : subject.task,
        minutes,
        progress: fraction(subject.leftAt, subject.etaAt, now),
        startLabel: copy.line('bounty.left', { time: clock(subject.leftAt) }),
        endLabel: copy.line('bounty.eta', { time: clock(subject.etaAt) }),
      };
    }
    case 'arrived': {
      const title = subject.place
        ? copy.line('bounty.arrived', { name: subject.helper, place: subject.place })
        : copy.line('bounty.arrivedPlain', { name: subject.helper });
      return {
        ...common,
        title,
        staleTitle: title,
        detail: copy.line('bounty.arrivedDetail'),
        minutes: null,
        progress: 1,
        startLabel: copy.line('bounty.left', { time: clock(subject.leftAt) }),
        endLabel: copy.line('bounty.arrivedAt', { time: clock(subject.arrivedAt) }),
      };
    }
    case 'meetup': {
      const minutes = minutesUntil(subject.departAt, now);
      const title = copy.line('ride.meetup', { place: startName(subject.start, copy) });
      return {
        ...common,
        title,
        staleTitle: title,
        detail: copy.line('ride.leaving', {
          count: minutes,
          arrived: subject.arrived,
          total: subject.total,
        }),
        minutes,
        progress: fraction(subject.gatherAt, subject.departAt, now),
        startLabel: copy.line('ride.gatherAt', { time: clock(subject.gatherAt) }),
        endLabel: copy.line('ride.departAt', { time: clock(subject.departAt) }),
      };
    }
    case 'departed': {
      const title = copy.line('ride.departed', { place: startName(subject.start, copy) });
      return {
        ...common,
        title,
        staleTitle: title,
        detail: copy.line('ride.aboard', { count: subject.aboard }),
        minutes: null,
        progress: 1,
        startLabel: copy.line('ride.gatherAt', { time: clock(subject.gatherAt) }),
        endLabel: copy.line('ride.departedAt', { time: clock(subject.departedAt) }),
      };
    }
  }
}
