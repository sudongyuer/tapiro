import { bountyCategory } from '@/lib/stickers/category';

import type { DraftPlace, PostDraft, TimeChoice } from './types';

export type DraftStorage = {
  read(userId: string): unknown;
  write(userId: string, draft: PostDraft | null): void;
};

type DraftFields = Omit<PostDraft, 'id' | 'updatedAt'>;

const BLANK: DraftFields = {
  title: '',
  category: null,
  rewardText: '',
  description: null,
  time: { kind: 'none' },
  place: null,
};

const isText = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function toTime(value: unknown): TimeChoice | null {
  const time = (value ?? {}) as Record<string, unknown>;
  if (time.kind === 'none') return { kind: 'none' };
  if (time.kind === 'deadline' && isText(time.deadlineAt)) {
    return { kind: 'deadline', deadlineAt: time.deadlineAt };
  }
  if (time.kind === 'window' && isText(time.startsAt) && isText(time.endsAt)) {
    return { kind: 'window', startsAt: time.startsAt, endsAt: time.endsAt };
  }
  return null;
}

function toPlace(value: unknown): DraftPlace | null | undefined {
  if (value === null) return null;
  const place = (value ?? {}) as Record<string, unknown>;
  if (!isText(place.label) || !isNumber(place.latitude) || !isNumber(place.longitude)) {
    return undefined;
  }
  if (place.address !== null && !isText(place.address)) return undefined;
  return {
    label: place.label,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
  };
}

export function toDraft(value: unknown): PostDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const draft = value as Record<string, unknown>;
  const category = draft.category === null ? null : bountyCategory(draft.category);
  const time = toTime(draft.time);
  const place = toPlace(draft.place);
  if (
    !isText(draft.id) ||
    draft.id === '' ||
    !isText(draft.title) ||
    (draft.category !== null && category === null) ||
    !isText(draft.rewardText) ||
    (draft.description !== null && !isText(draft.description)) ||
    time === null ||
    place === undefined ||
    !isText(draft.updatedAt)
  ) {
    return null;
  }
  return {
    id: draft.id,
    title: draft.title,
    category,
    rewardText: draft.rewardText,
    description: draft.description,
    time,
    place,
    updatedAt: draft.updatedAt,
  };
}

const blank = (text: string | null) => (text ?? '').trim() === '';

export function createDraftStore(
  storage: DraftStorage,
  newId: () => string,
  now: () => Date = () => new Date(),
) {
  let current: { userId: string; draft: PostDraft } | null = null;
  const listeners = new Set<() => void>();

  function set(next: typeof current) {
    if (next?.draft === current?.draft && next?.userId === current?.userId) return;
    current = next;
    for (const listener of listeners) listener();
  }

  function stored(userId: string) {
    try {
      return toDraft(storage.read(userId));
    } catch {
      return null;
    }
  }

  function load(userId: string): PostDraft {
    if (current?.userId === userId) return current.draft;
    const draft = stored(userId) ?? {
      ...BLANK,
      id: newId(),
      updatedAt: now().toISOString(),
    };
    current = { userId, draft };
    return draft;
  }

  return {
    load,
    update(userId: string, patch: Partial<PostDraft>) {
      const base = load(userId);
      const draft: PostDraft = {
        ...base,
        ...patch,
        id: base.id,
        updatedAt: now().toISOString(),
      };
      storage.write(userId, draft);
      set({ userId, draft });
    },
    clear(userId: string) {
      storage.write(userId, null);
      if (current?.userId === userId) set(null);
    },
    isEmpty(draft: PostDraft) {
      return (
        blank(draft.title) &&
        draft.category === BLANK.category &&
        blank(draft.rewardText) &&
        blank(draft.description) &&
        draft.time.kind === 'none' &&
        draft.place === null
      );
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): PostDraft | null {
      return current?.draft ?? null;
    },
  };
}

export type DraftStore = ReturnType<typeof createDraftStore>;
