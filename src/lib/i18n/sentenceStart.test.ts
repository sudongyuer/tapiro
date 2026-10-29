import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from './resources';
import { sentenceStart, sentenceStartOptions } from './sentenceStart';

function tFor(lng: string) {
  const i18n = createInstance().use(sentenceStart);
  i18n.init({
    ...sentenceStartOptions,
    resources,
    lng,
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return i18n.t;
}

describe('sentenceStart', () => {
  test('a sentence that opens with the fallback name starts upper-case', () => {
    const ms = tFor('ms');
    const en = tFor('en');
    expect(ms('bounty.detail.selected.title', { name: ms('bounty.post.unknownName') })).toBe(
      'Pihak lain memilih anda',
    );
    expect(en('bounty.detail.notSelected.body', { name: en('bounty.post.unknownName') })).toMatch(
      /^The other person /,
    );
  });

  test('fragments that start lower-case on purpose stay lower-case', () => {
    expect(tFor('en')('bounty.post.unknownName')).toBe('the other person');
    expect(tFor('ms')('bounty.post.confirm.tomorrow')).toBe('esok');
  });

  test('a name inside the sentence and Chinese are unchanged', () => {
    const zh = tFor('zh-Hans');
    expect(zh('bounty.detail.selected.title', { name: zh('bounty.post.unknownName') })).toBe(
      '对方选了你',
    );
  });
});
