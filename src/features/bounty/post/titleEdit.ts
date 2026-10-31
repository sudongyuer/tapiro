import { handArtFor, titleIntent } from '@/lib/handArt';
import type { BountyCategory } from '@/lib/stickers/category';

import { postKind } from './postKinds';
import type { PostDraft } from './types';

export function titlePatch(current: PostDraft, text: string): Partial<PostDraft> {
  const patch: Partial<PostDraft> = { title: text };
  if (current.categorySource !== 'chosen') {
    const guessed = titleIntent(text.trim(), null)?.category ?? null;
    patch.category = guessed;
    patch.categorySource = guessed ? 'auto' : null;
  }
  const category = patch.category === undefined ? current.category : patch.category;
  const auto = (title: string, from: BountyCategory | null) =>
    handArtFor({ art: null, category: from, title: title.trim() });
  if (current.art !== null && auto(current.title, current.category) !== auto(text, category)) {
    patch.art = null;
  }
  return patch;
}

export function pickPatch(category: BountyCategory, title: string): Partial<PostDraft> {
  const typed = titleIntent(title.trim(), category) !== null;
  return {
    category,
    categorySource: 'chosen',
    art: typed ? null : (postKind(category)?.art ?? null),
  };
}
