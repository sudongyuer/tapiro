import { toBountyFormPatch, type BountyDraft } from '@/lib/drafts/bountyDraft';

import type { PostDraft } from './types';

export const FILLED_ROWS = ['title', 'category', 'reward', 'time', 'description'] as const;
export type FilledRow = (typeof FILLED_ROWS)[number];

const ROW_FIELDS: Record<FilledRow, readonly (keyof PostDraft)[]> = {
  title: ['title', 'art'],
  category: ['category', 'categorySource'],
  reward: ['rewardText', 'currency'],
  time: ['time'],
  description: ['description'],
};

export type AiFill = {
  draftId: string;
  rows: FilledRow[];
  before: Partial<PostDraft>;
  after: Partial<PostDraft>;
  dropped: { field: 'reward' | 'time'; kept: boolean }[];
  placeHint: string | null;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function pick(draft: Partial<PostDraft>, fields: readonly (keyof PostDraft)[]) {
  return Object.fromEntries(fields.map((field) => [field, draft[field]])) as Partial<PostDraft>;
}

export function fillFromDraft(form: PostDraft, draft: BountyDraft, now: Date) {
  const patch = toBountyFormPatch(draft, {
    now,
    currency: form.currency,
    categorySource: form.categorySource,
  });
  const next: PostDraft = { ...form, ...patch.fields };
  const rows = FILLED_ROWS.filter((row) =>
    ROW_FIELDS[row].some((field) => !same(form[field], next[field])),
  );
  const fields = rows.flatMap((row) => ROW_FIELDS[row]);
  const fill: AiFill = {
    draftId: form.id,
    rows,
    before: pick(form, fields),
    after: pick(next, fields),
    dropped: patch.dropped.map((field) => ({
      field,
      kept: field === 'reward' ? form.rewardText.trim() !== '' : form.time.kind !== 'none',
    })),
    placeHint: patch.placeHint,
  };
  return { patch: pick(next, fields), fill };
}

// 撤销 puts back only rows that still hold what 小貘 filled; a row the user changed since keeps the user's value.
export function undoFill(current: PostDraft, fill: AiFill): Partial<PostDraft> {
  if (current.id !== fill.draftId) return {};
  const restored = fill.rows.filter((row) =>
    ROW_FIELDS[row].every((field) => same(current[field], fill.after[field])),
  );
  return pick(
    fill.before,
    restored.flatMap((row) => ROW_FIELDS[row]),
  );
}
