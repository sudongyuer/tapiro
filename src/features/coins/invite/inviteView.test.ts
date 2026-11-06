import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { personLabel, shareText, spelled } from './inviteView';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t.bind(i18n);
}

describe('invite page view', () => {
  test('the share text carries the code and the reward from the board', () => {
    expect(shareText('M8WQ4K', 3, translator('zh-Hans'))).toBe(
      '我在用 Tapiro 互相帮忙。填我的邀请码 M8WQ4K，你完成第一单后我们各得 3 颗貘币。',
    );
    expect(shareText('M8WQ4K', 3, translator('ms'))).toContain('M8WQ4K');
  });

  test('VoiceOver spells the code letter by letter', () => {
    expect(spelled('M8WQ4K')).toBe('M 8 W Q 4 K');
  });

  test('a deleted or unnamed friend reads as a fellow student, never blank', () => {
    const t = translator('zh-Hans');
    expect(personLabel(null, t)).toBe('一位同学');
    expect(personLabel({ id: 'x', name: '  ', avatarUrl: null }, t)).toBe('一位同学');
    expect(personLabel({ id: 'x', name: '阿明', avatarUrl: null }, t)).toBe('阿明');
  });
});
