import { describe, expect, test } from 'bun:test';

import { LANGUAGES } from '@/lib/i18n/languages';
import { resources } from '@/lib/i18n/resources';
import { BOUNTY_CATEGORIES } from '@/lib/stickers/category';

import { DRAFT_ERRORS } from './types';

describe.each(LANGUAGES.map((language) => language.code))('%s posting copy', (code) => {
  const bounty: { category: Record<string, unknown>; post: { error: Record<string, unknown> } } =
    resources[code].translation.bounty;

  test('names every category', () => {
    for (const category of BOUNTY_CATEGORIES) expect(bounty.category[category]).toBeString();
  });

  test('explains every draft error', () => {
    for (const error of DRAFT_ERRORS) expect(bounty.post.error[error]).toBeString();
  });
});
