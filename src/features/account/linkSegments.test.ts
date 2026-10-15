import { describe, expect, test } from 'bun:test';

import { resources } from '@/lib/i18n/resources';

import { linkSegments } from './linkSegments';

describe('linkSegments', () => {
  test('splits the Chinese terms line into text and two links', () => {
    expect(linkSegments(resources['zh-Hans'].translation.account.welcome.terms)).toEqual([
      { text: '继续即表示同意' },
      { text: '《用户协议》', link: 'terms' },
      { text: '和' },
      { text: '《隐私政策》', link: 'privacy' },
    ]);
  });

  test.each(Object.keys(resources))('%s links both pages exactly once', (code) => {
    const segments = linkSegments(
      resources[code as keyof typeof resources].translation.account.welcome.terms,
    );
    expect(segments.flatMap((s) => (s.link ? [s.link] : [])).sort()).toEqual(['privacy', 'terms']);
    expect(segments.every((s) => !s.text.includes('<'))).toBe(true);
  });

  test('a link may span a line break', () => {
    expect(linkSegments('a <terms>Terms\nof Use</terms>')).toEqual([
      { text: 'a ' },
      { text: 'Terms\nof Use', link: 'terms' },
    ]);
  });

  test('an unclosed tag falls back to plain text without the tag', () => {
    expect(linkSegments('agree to <terms>Terms')).toEqual([{ text: 'agree to Terms' }]);
  });

  test('a line without markers stays one plain segment', () => {
    expect(linkSegments('plain')).toEqual([{ text: 'plain' }]);
  });
});
