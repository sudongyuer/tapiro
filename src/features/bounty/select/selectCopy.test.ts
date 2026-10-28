import { expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { helpedLine, raceBody, selectFailureCopy, statusCopy } from './selectCopy';

function translator(lng: string) {
  const i18n = createInstance();
  i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
  return i18n.t;
}

const zh = translator('zh-Hans');
const en = translator('en');

test('each failure reads its own copy', () => {
  const keys = {
    failed: 'bounty.select.failure.failed',
    notPending: 'bounty.select.failure.notPending',
    noPayee: 'bounty.select.failure.noPayee',
    closed: 'bounty.select.failure.closed',
    gone: 'bounty.detail.gone',
  } as const;
  for (const [reason, key] of Object.entries(keys) as [keyof typeof keys, string][]) {
    expect(selectFailureCopy(reason, zh)).toBe(zh(key as never));
    expect(selectFailureCopy(reason, zh)).not.toBe(key);
  }
  expect(
    new Set(Object.keys(keys).map((reason) => selectFailureCopy(reason as never, zh))).size,
  ).toBe(5);
});

test('zero helps reads as never helped; otherwise the count with plurals', () => {
  expect(helpedLine(0, zh)).toBe('还没帮过');
  expect(helpedLine(14, zh)).toBe('帮过 14 次');
  expect(helpedLine(1, en)).toBe('Helped 1 time');
  expect(helpedLine(128, en)).toBe('Helped 128 times');
});

test('the status line has a count only when the list loaded', () => {
  expect(statusCopy({ key: 'bounty.select.statusOpen', count: 3 }, zh)).toBe('等你选人 · 3 人申请');
  expect(statusCopy({ key: 'bounty.select.statusOpenNoCount' }, zh)).toBe('等你选人');
  expect(statusCopy({ key: 'bounty.select.statusEmpty' }, zh)).toBe('等人申请');
});

test('the race body names the helper when it is known', () => {
  expect(raceBody('阿杰', zh)).toBe(zh('bounty.select.race.body', { name: '阿杰' }));
  expect(raceBody('阿杰', zh)).toContain('阿杰');
  expect(raceBody(null, zh)).toBe(zh('bounty.select.race.bodyNoName'));
});
