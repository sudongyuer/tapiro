import type { DraftPlace, PostDraft } from './types';

type Typed = {
  title: string;
  rewardText: string;
  description: string;
  placeLabel: string;
  address: string;
};

function typedPlace(stored: DraftPlace | null, typed: Typed): DraftPlace | null {
  if (stored === null) return null;
  const address = typed.address === '' ? null : typed.address;
  if (stored.label === typed.placeLabel && stored.address === address) return stored;
  return { ...stored, label: typed.placeLabel, address };
}

export function typedPatch(
  stored: PostDraft,
  draftId: string,
  typed: Typed,
): Partial<PostDraft> | null {
  if (stored.id !== draftId) return null;
  const patch: Partial<PostDraft> = {
    title: typed.title,
    rewardText: typed.rewardText,
    description: stored.description === null ? null : typed.description,
    place: typedPlace(stored.place, typed),
  };
  const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
    (key) => patch[key] !== stored[key],
  );
  return changed ? patch : null;
}
