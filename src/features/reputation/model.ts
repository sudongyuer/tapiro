import {
  ACCESSORIES,
  CHIPS,
  CHIPS_MAX,
  REVIEW_TEXT_MAX,
  type Accessory,
  type Face,
  type ReviewDraft,
  type ReviewPair,
  type Role,
  type ValidDraft,
} from './types';

export function mascotLevel(stickers: number) {
  if (stickers >= 25) return 5 + Math.floor((stickers - 25) / 15);
  if (stickers >= 15) return 4;
  if (stickers >= 8) return 3;
  if (stickers >= 3) return 2;
  return 1;
}

export function levelStartsAt(level: number) {
  if (level <= 1) return 0;
  if (level === 2) return 3;
  if (level === 3) return 8;
  if (level === 4) return 15;
  return 25 + 15 * (level - 5);
}

export const NAMED_LEVELS = 5;

export const levelNameKey = (level: number) =>
  level > NAMED_LEVELS ? 'reputation.level.grown' : `reputation.level.lv${Math.max(1, level)}`;

const ACCESSORY_LEVEL: Record<Accessory, number> = {
  red_hat: 2,
  backpack: 3,
  umbrella: 4,
  scarf: 5,
};

export const accessoryLevel = (accessory: Accessory) => ACCESSORY_LEVEL[accessory];

export const unlockedAccessories = (level: number) =>
  ACCESSORIES.filter((accessory) => ACCESSORY_LEVEL[accessory] <= level);

export const chipsFor = (role: Role, face: Face): readonly string[] =>
  face === 'happy' ? CHIPS[role].good : CHIPS[role].notGood;

const EDGE_SPACE = /^[\s ​﻿]+|[\s ​﻿]+$/g;

export const cleanText = (text: string) => text.replace(EDGE_SPACE, '');

export const textLength = (text: string) => [...cleanText(text)].length;

export const textFits = (text: string) => textLength(text) <= REVIEW_TEXT_MAX;

export const EMPTY_DRAFT: ReviewDraft = { face: null, chips: [], sentence: '' };

export function pickFace(draft: ReviewDraft, role: Role, face: Face): ReviewDraft {
  const allowed = chipsFor(role, face);
  return { ...draft, face, chips: draft.chips.filter((chip) => allowed.includes(chip)) };
}

export function toggleChip(draft: ReviewDraft, role: Role, chip: string): ReviewDraft {
  if (!draft.face || !chipsFor(role, draft.face).includes(chip)) return draft;
  if (draft.chips.includes(chip)) {
    return { ...draft, chips: draft.chips.filter((picked) => picked !== chip) };
  }
  if (draft.chips.length >= CHIPS_MAX) return draft;
  return { ...draft, chips: [...draft.chips, chip] };
}

export function validDraft(draft: ReviewDraft, role: Role): ValidDraft | null {
  const { face, chips } = draft;
  if (!face || chips.length > CHIPS_MAX || new Set(chips).size !== chips.length) return null;
  const allowed = chipsFor(role, face);
  if (chips.some((chip) => !allowed.includes(chip))) return null;
  if (!textFits(draft.sentence)) return null;
  const sentence = cleanText(draft.sentence);
  return { face, chips: [...chips], sentence: sentence === '' ? null : sentence };
}

export const draftFromReview = (pair: ReviewPair): ReviewDraft =>
  pair.mine
    ? { face: pair.mine.face, chips: [...pair.mine.chips], sentence: pair.mine.sentence ?? '' }
    : EMPTY_DRAFT;

export function draftChanged(draft: ReviewDraft, from: ReviewDraft) {
  return (
    draft.face !== from.face ||
    cleanText(draft.sentence) !== cleanText(from.sentence) ||
    draft.chips.length !== from.chips.length ||
    draft.chips.some((chip) => !from.chips.includes(chip))
  );
}

export const canReview = (pair: ReviewPair) =>
  pair.state === 'open' || (pair.state === 'sealed' && pair.mine?.editable === true);

export const daysLeft = (closesAt: string, now: Date) =>
  Math.max(0, Math.ceil((Date.parse(closesAt) - now.getTime()) / 86_400_000));
