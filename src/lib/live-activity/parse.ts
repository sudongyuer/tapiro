import { liveActivityLink, type LiveActivitySubject } from './content';

type Row = Record<string, unknown>;

class Invalid extends Error {}

function time(row: Row, key: string) {
  const value = row[key];
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(parsed)) throw new Invalid(key);
  return parsed;
}

function text(row: Row, key: string) {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) throw new Invalid(key);
  return value;
}

function count(row: Row, key: string) {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Invalid(key);
  return value;
}

function bounty(row: Row): LiveActivitySubject {
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
  throw new Invalid('phase');
}

function ride(row: Row): LiveActivitySubject {
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
  throw new Invalid('phase');
}

export type LiveActivityRead = { subjects: LiveActivitySubject[]; unreadable: string[] };

function linkOf(row: Row) {
  if (typeof row.id !== 'string' || row.id.length === 0) return null;
  if (row.kind === 'bounty') return liveActivityLink({ kind: 'bounty', id: row.id });
  if (row.kind === 'ride') return liveActivityLink({ kind: 'ride', id: row.id });
  return null;
}

// An unreadable row is reported by its link, so its running activity is left as it is instead of read as gone.
export function toLiveActivityRead(value: unknown): LiveActivityRead {
  if (!Array.isArray(value)) throw new Error('live activity subjects');
  const read: LiveActivityRead = { subjects: [], unreadable: [] };
  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Row;
    try {
      if (row.kind === 'bounty') read.subjects.push(bounty(row));
      else if (row.kind === 'ride') read.subjects.push(ride(row));
    } catch (error) {
      if (!(error instanceof Invalid)) throw error;
      const link = linkOf(row);
      if (link) read.unreadable.push(link);
    }
  }
  return read;
}
