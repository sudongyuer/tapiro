import { expect, test } from 'bun:test';

import { formatRinggit, formatRinggitParts } from './money';

test.each(['zh-Hans', 'en', 'ms'])(
  'formatRinggit shows sen as RM with two decimals in %s',
  (locale) => {
    const normalized = (sen: number) => formatRinggit(sen, locale).replace(/\s/g, ' ');
    expect(normalized(1250)).toMatch(/^RM ?12\.50$/);
    expect(normalized(5)).toMatch(/^RM ?0\.05$/);
    expect(normalized(123456)).toMatch(/^RM ?1,234\.56$/);
    expect(normalized(1234560)).toMatch(/^RM ?12,345\.60$/);
    expect(normalized(50)).toMatch(/^RM ?0\.50$/);
    expect(normalized(0)).toMatch(/^RM ?0\.00$/);
  },
);

test.each(['zh-Hans', 'en', 'ms'])('formatRinggitParts splits whole and cents in %s', (locale) => {
  expect(formatRinggitParts(1234560, locale)).toEqual({ whole: '12,345', cents: '.60' });
  expect(formatRinggitParts(50, locale)).toEqual({ whole: '0', cents: '.50' });
  expect(formatRinggitParts(-1250, locale)).toEqual({ whole: '-12', cents: '.50' });
});
