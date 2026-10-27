import type { PostDraft } from './types';

type Typed = { title: string; rewardText: string; description: string };

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
  };
  const changed = (Object.keys(patch) as (keyof typeof patch)[]).some(
    (key) => patch[key] !== stored[key],
  );
  return changed ? patch : null;
}
