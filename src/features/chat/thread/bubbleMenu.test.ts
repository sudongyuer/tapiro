import { describe, expect, test } from 'bun:test';
import type { TFunction } from 'i18next';

import { bubbleMenu } from './bubbleMenu';

const t = ((key: string) => key) as unknown as TFunction;
const ids = (...args: Parameters<typeof bubbleMenu>) =>
  bubbleMenu(...args).map((action) => action.id);

describe('the long-press menu', () => {
  test('a message from the other side offers 翻译 between 复制 and 举报', () => {
    expect(ids(t, { translatable: true, translation: null, reportable: true })).toEqual([
      'copy',
      'translate',
      'report',
    ]);
  });

  test('a shown or failed translation offers 隐藏翻译 instead', () => {
    for (const translation of [
      { state: 'shown', text: '好' },
      { state: 'failed', reason: 'busy' },
    ] as const) {
      expect(ids(t, { translatable: true, translation, reportable: true })).toEqual([
        'copy',
        'hideTranslation',
        'report',
      ]);
    }
  });

  test('nothing about translation while one is under way, or on your own message', () => {
    expect(
      ids(t, { translatable: true, translation: { state: 'waiting' }, reportable: true }),
    ).toEqual(['copy', 'report']);
    expect(ids(t, { translatable: false, translation: null, reportable: false })).toEqual(['copy']);
  });
});
