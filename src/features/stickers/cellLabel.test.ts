import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';
import { WORST_NAME, WORST_TITLE } from '@/lib/stickers/worstCase';

import { cellLabel } from './cellLabel';

const translator = (lng: string) => {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
};

describe('sticker cell label', () => {
  test('VoiceOver reads who helped whom, then the title, then the date', () => {
    const label = cellLabel(
      { role: 'payer', itemKind: 'bounty', counterpartName: 'Lily', title: '帮买奶茶' },
      '10/24',
      translator('zh-Hans'),
    );
    expect(label).toEqual({
      line1: 'Lily帮我',
      title: '帮买奶茶',
      a11y: 'Lily帮我，帮买奶茶，10/24',
    });
  });

  test('an unnamed payee reads 帮一位同学 and a ride reads 和 in English', () => {
    expect(
      cellLabel(
        { role: 'payee', itemKind: 'bounty', counterpartName: null, title: '陪诊' },
        '10/24',
        translator('zh-Hans'),
      ).a11y,
    ).toBe('帮一位同学，陪诊，10/24');
    expect(
      cellLabel(
        { role: 'payer', itemKind: 'ride', counterpartName: '阿杰', title: '拼车回 YC' },
        '10/24',
        translator('en'),
      ).a11y,
    ).toBe('With 阿杰, 拼车回 YC, 10/24');
  });

  test('VoiceOver reads the whole title and name even where the cell truncates them', () => {
    const { a11y } = cellLabel(
      { role: 'payee', itemKind: 'bounty', counterpartName: WORST_NAME, title: WORST_TITLE },
      '10/24',
      translator('ms'),
    );
    expect(a11y).toBe(`Bantu ${WORST_NAME}, ${WORST_TITLE}, 10/24`);
  });
});
