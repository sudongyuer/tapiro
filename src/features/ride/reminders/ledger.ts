import type { SettingsLike } from '@/features/place/originStore';

export type LedgerEntry = { id: string; at: number };

const KEY = 'tapiro.rideReminderLedger';

const isEntry = (value: unknown): value is LedgerEntry => {
  const entry = value as LedgerEntry | null;
  return typeof entry?.id === 'string' && typeof entry.at === 'number';
};

export function readLedger(settings: SettingsLike): LedgerEntry[] {
  const raw = settings.get(KEY);
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function writeLedger(settings: SettingsLike, entries: readonly LedgerEntry[]) {
  settings.set({ [KEY]: entries.length > 0 ? JSON.stringify(entries) : '' });
}

export function nextLedger(
  ledger: readonly LedgerEntry[],
  change: {
    inScope: (id: string) => boolean;
    cancelled: readonly string[];
    scheduled: readonly LedgerEntry[];
    keepRide: (id: string) => boolean;
  },
  now: number,
): LedgerEntry[] {
  const cancelled = new Set(change.cancelled);
  const replaced = new Map(change.scheduled.map((entry) => [entry.id, entry]));
  const kept = ledger.filter((entry) => {
    if (replaced.has(entry.id)) return false;
    const fired = entry.at <= now;
    if (!change.inScope(entry.id)) return true;
    if (fired) return change.keepRide(entry.id);
    return !cancelled.has(entry.id);
  });
  return [...kept, ...replaced.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

export type ReminderTimes = { sentAt: number | null; nextAt: number | null };

export function reminderTimes(
  ledger: readonly LedgerEntry[],
  matches: (id: string) => boolean,
  now: number,
): ReminderTimes {
  const mine = ledger.filter((entry) => matches(entry.id));
  const sent = mine.filter((entry) => entry.at <= now).map((entry) => entry.at);
  const next = mine.filter((entry) => entry.at > now).map((entry) => entry.at);
  return {
    sentAt: sent.length > 0 ? Math.max(...sent) : null,
    nextAt: next.length > 0 ? Math.min(...next) : null,
  };
}
