import { describe, expect, test } from 'bun:test';

import { BOUNTY_CATEGORIES } from '@/lib/stickers/category';

import { CATEGORY_ART, HAND_ART_IDS } from './ids';
import { INTENTS } from './intents';
import { handArtFor, nextHandArt, titleIntent } from './resolve';

const LOCALES = ['zh-Hans', 'en', 'ms'] as const;

describe('title intent', () => {
  for (const intent of INTENTS) {
    for (const locale of LOCALES) {
      test(`${intent.id} in ${locale}`, () => {
        expect(intent.words[locale].length).toBeGreaterThan(0);
        for (const word of intent.words[locale]) {
          const title = locale === 'zh-Hans' ? `帮我${word}一下` : `Help: ${word} please`;
          expect(handArtFor({ category: intent.category, title })).toBe(intent.art);
        }
      });
    }
  }

  test('real titles from the fixtures', () => {
    const cases: [string, (typeof BOUNTY_CATEGORIES)[number], string][] = [
      ['帮买奶茶', 'buy', 'tea'],
      ['帮带一杯咖啡', 'buy', 'tea'],
      ['帮取快递', 'pickup', 'parcel'],
      ['帮忙排队领证件', 'queue', 'queue'],
      ['陪诊', 'accompany', 'accompany'],
      ['帮忙在 Jabatan Imigresen Putrajaya 排队续签学生准证', 'handle', 'document'],
      ['Wan Nurul Aisyah binti Wan Abdul Rahman 的毕业论文打印和装订', 'study', 'study'],
      ['Tolong belikan ubat demam', 'buy', 'medicine'],
      ['Pick up my parcels at the guardhouse', 'pickup', 'parcel'],
      ['Buy groceries from Jaya Grocer', 'buy', 'bag'],
    ];
    for (const [title, category, art] of cases) {
      expect(handArtFor({ category, title })).toBe(art as never);
    }
  });

  test('the chosen category wins over another category matching the same title', () => {
    expect(titleIntent('打印签证材料', 'handle')?.category).toBe('handle');
    expect(handArtFor({ category: 'pickup', title: '取外卖' })).toBe('food');
  });

  test('a title matching another category still gets that drawing', () => {
    expect(handArtFor({ category: 'other', title: '带杯奶茶' })).toBe('tea');
  });

  test('Latin words match whole words only', () => {
    expect(handArtFor({ category: 'other', title: 'formal dinner dress' })).toBe('food');
    expect(handArtFor({ category: 'other', title: 'online stuff' })).toBe('other');
  });
});

describe('fallbacks', () => {
  test('no intent falls back to the category drawing', () => {
    for (const category of BOUNTY_CATEGORIES) {
      expect(handArtFor({ category, title: 'xyz' })).toBe(CATEGORY_ART[category]);
    }
  });

  test('no category and no intent is the cat', () => {
    expect(handArtFor({ category: null, title: '' })).toBe('other');
  });

  test('a stored art wins; an unknown stored art is ignored', () => {
    expect(handArtFor({ art: 'car', category: 'buy', title: '带杯奶茶' })).toBe('car');
    expect(handArtFor({ art: 'unicorn', category: 'buy', title: '带杯奶茶' })).toBe('tea');
    expect(handArtFor({ art: null, category: 'buy', title: '' })).toBe('bag');
  });
});

test('swapping walks the whole set and comes back', () => {
  const seen = new Set<string>();
  let id = nextHandArt('parcel');
  while (id !== 'parcel') {
    seen.add(id);
    id = nextHandArt(id);
  }
  expect(seen.size).toBe(HAND_ART_IDS.length - 1);
});
