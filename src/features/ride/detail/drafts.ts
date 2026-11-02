import type { DetailsInput, RideDetails } from './types';

export const NOTE_MAX = 140;
export const PLATE_MAX = 40;

export type DetailsDraft = { plate: string; eta: string | null; meetingNote: string };

const blank = (text: string) => {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
};

export function detailsDraftFrom(details: RideDetails | null): DetailsDraft {
  return {
    plate: details?.plate ?? '',
    eta: details?.eta ?? null,
    meetingNote: details?.meetingNote ?? '',
  };
}

export function toDetailsInput(draft: DetailsDraft): DetailsInput | null {
  const plate = blank(draft.plate);
  const meetingNote = blank(draft.meetingNote);
  if (
    (plate && [...plate].length > PLATE_MAX) ||
    (meetingNote && [...meetingNote].length > NOTE_MAX)
  ) {
    return null;
  }
  return { plate, eta: draft.eta, meetingNote };
}

export function toApplyNote(text: string): string | null | undefined {
  const note = blank(text);
  if (note && [...note].length > NOTE_MAX) return undefined;
  return note;
}

function createDrafts<T>() {
  const drafts = new Map<string, T>();
  return {
    get: (id: string) => drafts.get(id) ?? null,
    set: (id: string, value: T) => void drafts.set(id, value),
    clear: (id: string) => void drafts.delete(id),
    reset: () => drafts.clear(),
  };
}

export const applyNotes = createDrafts<string>();
export const detailsDrafts = createDrafts<DetailsDraft>();
