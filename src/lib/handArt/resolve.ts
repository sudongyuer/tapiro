import type { BountyCategory } from '@/lib/stickers/category';

import { CATEGORY_ART, HAND_ART_IDS, handArtId, type HandArtId } from './ids';
import { INTENTS, type Intent } from './intents';

const LATIN = /^[a-z0-9 .'-]+$/;

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCHERS = INTENTS.map((intent) => {
  const words = Object.values(intent.words).flat();
  const latin = words.filter((word) => LATIN.test(word)).map(escape);
  const other = words.filter((word) => !LATIN.test(word));
  const pattern = latin.length
    ? new RegExp(`(?<![a-z])(?:${latin.join('|')})(?:s|es)?(?![a-z])`)
    : null;
  return {
    intent,
    test: (text: string) =>
      other.some((word) => text.includes(word)) || (pattern?.test(text) ?? false),
  };
});

export function titleIntent(title: string, category: BountyCategory | null): Intent | null {
  const text = title.toLowerCase().normalize('NFKC');
  if (!text.trim()) return null;
  const matches = MATCHERS.filter((matcher) => matcher.test(text)).map(({ intent }) => intent);
  return matches.find((intent) => intent.category === category) ?? matches[0] ?? null;
}

export type ArtSource = {
  art?: string | null;
  category: BountyCategory | null;
  title: string;
};

export function handArtFor({ art, category, title }: ArtSource): HandArtId {
  return (
    handArtId(art) ??
    titleIntent(title, category)?.art ??
    (category ? CATEGORY_ART[category] : 'other')
  );
}

export function nextHandArt(current: HandArtId): HandArtId {
  return HAND_ART_IDS[(HAND_ART_IDS.indexOf(current) + 1) % HAND_ART_IDS.length];
}
