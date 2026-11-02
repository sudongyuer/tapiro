import type { CurrencyCode } from '@/lib/money';
import type { SettingsLike } from '@/features/place/originStore';

import type { SplitMode } from '../types';

export const RIDE_TILES = ['home', 'campus', 'mall', 'airport'] as const;
export type RideTile = (typeof RIDE_TILES)[number];

export type DraftPlace = {
  label: string;
  latitude: number;
  longitude: number;
  short: string;
  shortEdited: boolean;
};

export type RideDraft = {
  id: string;
  tile: RideTile | null;
  start: DraftPlace | null;
  dest: DraftPlace | null;
  departAt: string | null;
  seats: number;
  estimateText: string;
  currency: CurrencyCode;
  splitMode: SplitMode;
  airportOpen: boolean;
  flightClock: string | null;
  largeBags: number;
  noteOpen: boolean;
  note: string;
};

export const SEATS = { min: 2, max: 6, initial: 4 } as const;
export const BAGS_MAX = 9;

const key = (userId: string) => `tapiro.rideDraft.${userId}`;

export function emptyDraft(id: string, currency: CurrencyCode): RideDraft {
  return {
    id,
    tile: null,
    start: null,
    dest: null,
    departAt: null,
    seats: SEATS.initial,
    estimateText: '',
    currency,
    splitMode: 'tapiro',
    airportOpen: false,
    flightClock: null,
    largeBags: 0,
    noteOpen: false,
    note: '',
  };
}

const isPlace = (value: unknown): value is DraftPlace => {
  const place = value as DraftPlace | null;
  return (
    typeof place?.label === 'string' &&
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    typeof place.short === 'string' &&
    typeof place.shortEdited === 'boolean'
  );
};

export function restoreDraft(value: unknown, fallback: RideDraft): RideDraft {
  if (typeof value !== 'object' || value === null) return fallback;
  const stored = value as Partial<RideDraft>;
  if (typeof stored.id !== 'string') return fallback;
  return {
    ...fallback,
    ...stored,
    start: isPlace(stored.start) ? stored.start : null,
    dest: isPlace(stored.dest) ? stored.dest : null,
  };
}

export function isEmptyDraft(draft: RideDraft) {
  return (
    draft.start === null &&
    draft.dest === null &&
    draft.departAt === null &&
    draft.estimateText.trim() === '' &&
    draft.note.trim() === ''
  );
}

// Stored as a JSON string and cleared by writing '': Settings.set drops null-valued keys.
export function createRideDraftStore(
  settings: SettingsLike,
  newId: () => string,
  currency: () => CurrencyCode,
) {
  const cache = new Map<string, RideDraft>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function read(userId: string): RideDraft {
    const raw = settings.get(key(userId));
    if (typeof raw !== 'string' || raw === '') return emptyDraft(newId(), currency());
    try {
      return restoreDraft(JSON.parse(raw), emptyDraft(newId(), currency()));
    } catch {
      return emptyDraft(newId(), currency());
    }
  }

  function write(userId: string, draft: RideDraft | null) {
    settings.set({ [key(userId)]: draft === null ? '' : JSON.stringify(draft) });
  }

  const store = {
    load(userId: string): RideDraft {
      const cached = cache.get(userId);
      if (cached) return cached;
      const draft = read(userId);
      cache.set(userId, draft);
      return draft;
    },
    update(userId: string, patch: Partial<RideDraft>) {
      const next = { ...store.load(userId), ...patch };
      cache.set(userId, next);
      write(userId, next);
      notify();
    },
    reset(userId: string) {
      cache.set(userId, emptyDraft(newId(), currency()));
      write(userId, null);
      notify();
    },
    clear(userId: string) {
      cache.delete(userId);
      write(userId, null);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return store;
}

export type RideDraftStore = ReturnType<typeof createRideDraftStore>;
