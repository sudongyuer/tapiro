import { expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { doneTitle, helpedLine, raceBody, selectFailureCopy, statusCopy } from './selectCopy';

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
  expect(helpedLine(0, zh)).toBe(zh('bounty.select.meta.neverHelped'));
  expect(helpedLine(14, zh)).toBe(zh('bounty.select.meta.helped', { count: 14 }));
  expect(helpedLine(14, zh)).toContain('14');
  expect(helpedLine(1, en)).not.toBe(helpedLine(2, en).replace('2', '1'));
});

test('the status line has a count only when the list loaded', () => {
  const counted = statusCopy({ key: 'bounty.select.statusOpen', count: 3 }, zh);
  expect(counted).toBe(zh('bounty.select.statusOpen', { count: 3 }));
  expect(counted).toContain('3');
  expect(statusCopy({ key: 'bounty.select.statusOpenNoCount' }, zh)).toBe(
    zh('bounty.select.statusOpenNoCount'),
  );
  expect(statusCopy({ key: 'bounty.select.statusEmpty' }, zh)).toBe(
    zh('bounty.select.statusEmpty'),
  );
});

test('the done title names the helper, or reads without a name while it is pending', () => {
  const helper = { id: 'jie', name: '阿杰', tier: 'very_reliable' } as const;
  expect(doneTitle(helper, zh)).toBe(zh('bounty.select.done.title', { name: '阿杰' }));
  expect(doneTitle(null, zh)).toBe(zh('bounty.select.done.titleNoName'));
  expect(doneTitle({ ...helper, name: null }, zh)).toBe(zh('bounty.select.done.titleNoName'));
  for (const t of [zh, en, translator('ms')]) {
    expect(doneTitle(null, t)).not.toBe('bounty.select.done.titleNoName');
    expect(doneTitle(null, t)).not.toContain('{{');
  }
});

test('the race body names the helper when it is known', () => {
  expect(raceBody('阿杰', zh)).toBe(zh('bounty.select.race.body', { name: '阿杰' }));
  expect(raceBody('阿杰', zh)).toContain('阿杰');
  expect(raceBody(null, zh)).toBe(zh('bounty.select.race.bodyNoName'));
});
