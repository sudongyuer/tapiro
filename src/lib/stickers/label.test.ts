import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { createFixtureStickerService } from './fixture';
import { stickerLabel } from './label';
import type { Sticker } from './model';
import { toSticker } from './service';
import { WORST_NAME, WORST_TITLE } from './worstCase';

const translator = (lng: string) => {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
};

const zh = translator('zh-Hans');
const en = translator('en');

type Case = [Sticker['role'], Sticker['itemKind'], string | null, string, string];

const CASES: Case[] = [
  ['payee', 'bounty', '小林', '帮小林', 'Helped 小林'],
  ['payer', 'bounty', 'Lily', 'Lily帮我', 'Lily helped me'],
  ['payee', 'bounty', null, '帮一位同学', 'Helped a fellow student'],
  ['payer', 'bounty', null, '一位同学帮我', 'A fellow student helped me'],
  ['payee', 'ride', '阿杰', '和阿杰', 'With 阿杰'],
  ['payer', 'ride', '阿杰', '和阿杰', 'With 阿杰'],
  ['payee', 'ride', null, '和一位同学', 'With a fellow student'],
  ['payer', 'ride', null, '和一位同学', 'With a fellow student'],
];

describe('sticker label', () => {
  for (const [role, itemKind, counterpartName, zhLine, enLine] of CASES) {
    test(`${role} × ${itemKind} × ${counterpartName ? 'named' : 'unnamed'}`, () => {
      const sticker = { role, itemKind, counterpartName, title: '帮取快递' };
      expect(stickerLabel(sticker, zh)).toEqual({ line1: zhLine, title: '帮取快递' });
      expect(stickerLabel(sticker, en)).toEqual({ line1: enLine, title: '帮取快递' });
    });
  }

  test('a blank name reads as no name', () => {
    expect(
      stickerLabel({ role: 'payer', itemKind: 'bounty', counterpartName: '  ', title: 'x' }, zh)
        .line1,
    ).toBe('一位同学帮我');
  });

  test('the title is kept as typed, never spliced into line 1', () => {
    const label = stickerLabel(
      { role: 'payee', itemKind: 'bounty', counterpartName: WORST_NAME, title: WORST_TITLE },
      zh,
    );
    expect(label).toEqual({ line1: `帮${WORST_NAME}`, title: WORST_TITLE });
  });
});

describe('sticker book read', () => {
  test('a sticker_book row carries its role and the counterpart, or null when the account is gone', () => {
    const row = {
      id: 's1',
      paymentId: 'p1',
      role: 'payer',
      itemKind: 'bounty',
      category: 'buy',
      art: 'tea',
      title: '帮买奶茶',
      earnedAt: '2026-10-29T04:00:00Z',
      counterpartName: 'Lily',
    };
    expect(toSticker(row)).toEqual(row as Sticker);
    expect(toSticker({ ...row, counterpartName: null }).counterpartName).toBeNull();
    expect(toSticker({ ...row, art: 7 }).art).toBeNull();
    expect(toSticker({ ...row, art: undefined }).art).toBeNull();
  });

  test('an unknown role fails the read instead of guessing', () => {
    expect(() => toSticker({ id: 's1', paymentId: 'p1', role: 'helper' })).toThrow();
  });

  test('the fixtures cover both roles, an unnamed counterpart, a ride and the worst lengths', async () => {
    const seven = await createFixtureStickerService('seven').list('u');
    expect(new Set(seven.map((sticker) => sticker.role))).toEqual(new Set(['payee', 'payer']));
    expect(seven.some((sticker) => sticker.counterpartName === null)).toBe(true);
    expect(seven.some((sticker) => sticker.itemKind === 'ride')).toBe(true);
    const worst = await createFixtureStickerService('worst').list('u');
    expect(worst.some((sticker) => sticker.title === WORST_TITLE)).toBe(true);
    expect(worst.some((sticker) => sticker.counterpartName === WORST_NAME)).toBe(true);
    expect([...WORST_NAME].length).toBe(40);
    expect([...WORST_TITLE].length).toBe(120);
  });

  test('a fixture settle is the payee sticker naming the payer', async () => {
    const service = createFixtureStickerService('none');
    service.earn({
      paymentId: 'pay-1',
      itemKind: 'bounty',
      category: 'pickup',
      title: '帮取快递',
      counterpartName: '阿杰',
    });
    const [earned] = await service.list('u');
    expect(earned).toMatchObject({ role: 'payee', counterpartName: '阿杰' });
  });
});
