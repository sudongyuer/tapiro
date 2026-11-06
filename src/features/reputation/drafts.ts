import { FACES, type ReviewDraft } from './types';

export type SettingsLike = {
  get(key: string): unknown;
  set(values: Record<string, unknown>): void;
};

const key = (userId: string) => `tapiro.reviewDrafts.${userId}`;

type Stored = { reviews: Record<string, ReviewDraft>; replies: Record<string, string> };

const EMPTY: Stored = { reviews: {}, replies: {} };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toDraft(value: unknown): ReviewDraft | null {
  if (!isObject(value)) return null;
  const face = FACES.find((candidate) => candidate === value.face) ?? null;
  if (value.face !== null && face === null) return null;
  if (!Array.isArray(value.chips) || !value.chips.every((chip) => typeof chip === 'string'))
    return null;
  if (typeof value.sentence !== 'string') return null;
  return { face, chips: value.chips as string[], sentence: value.sentence };
}

function read(settings: SettingsLike, userId: string): Stored {
  const raw = settings.get(key(userId));
  if (typeof raw !== 'string' || raw === '') return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return EMPTY;
    const reviews = isObject(parsed.reviews) ? parsed.reviews : {};
    const replies = isObject(parsed.replies) ? parsed.replies : {};
    return {
      reviews: Object.fromEntries(
        Object.entries(reviews).flatMap(([target, draft]) => {
          const valid = toDraft(draft);
          return valid ? [[target, valid]] : [];
        }),
      ),
      replies: Object.fromEntries(
        Object.entries(replies).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
        ),
      ),
    };
  } catch {
    return EMPTY;
  }
}

const isEmptyDraft = (draft: ReviewDraft) =>
  draft.face === null && draft.chips.length === 0 && draft.sentence === '';

export function createReviewDrafts(settings: SettingsLike) {
  const cache = new Map<string, Stored>();
  const load = (userId: string) => {
    let stored = cache.get(userId);
    if (!stored) {
      stored = read(settings, userId);
      cache.set(userId, stored);
    }
    return stored;
  };
  const save = (userId: string, stored: Stored) => {
    cache.set(userId, stored);
    const empty =
      Object.keys(stored.reviews).length === 0 && Object.keys(stored.replies).length === 0;
    settings.set({ [key(userId)]: empty ? '' : JSON.stringify(stored) });
  };
  return {
    review: (userId: string, target: string): ReviewDraft | null =>
      load(userId).reviews[target] ?? null,
    setReview(userId: string, target: string, draft: ReviewDraft | null) {
      const stored = load(userId);
      const { [target]: _dropped, ...rest } = stored.reviews;
      const reviews = draft && !isEmptyDraft(draft) ? { ...rest, [target]: draft } : rest;
      save(userId, { ...stored, reviews });
    },
    reply: (userId: string, reviewId: string) => load(userId).replies[reviewId] ?? '',
    setReply(userId: string, reviewId: string, text: string) {
      const stored = load(userId);
      if ((stored.replies[reviewId] ?? '') === text) return;
      const { [reviewId]: _dropped, ...rest } = stored.replies;
      save(userId, { ...stored, replies: text === '' ? rest : { ...rest, [reviewId]: text } });
    },
    clear(userId: string) {
      save(userId, EMPTY);
    },
  };
}

export type ReviewDrafts = ReturnType<typeof createReviewDrafts>;
