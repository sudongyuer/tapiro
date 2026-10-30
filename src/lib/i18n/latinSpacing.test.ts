import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { latinSpacing } from './latinSpacing';
import { resources } from './resources';

function tFor(lng: string) {
  const i18n = createInstance().use(latinSpacing);
  i18n.init({
    postProcess: ['latinSpacing'],
    resources,
    lng,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return i18n.t;
}

describe('latinSpacing', () => {
  test('a Latin name next to Chinese gets a space, a Chinese name does not', () => {
    const zh = tFor('zh-Hans');
    expect(zh('stickers.label.payer', { name: 'Lily' })).toBe('Lily 帮我');
    expect(zh('stickers.label.payer', { name: '小林' })).toBe('小林帮我');
  });

  test('other languages are unchanged', () => {
    expect(tFor('en')('stickers.label.payer', { name: '小林' })).toBe('小林 helped me');
  });
});
