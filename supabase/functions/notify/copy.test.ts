import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { latinSpacing as appLatinSpacing } from '../../../src/lib/i18n/latinSpacing';
import { COPY_KINDS, LANGUAGES, latinSpacing, pushCopy, toLanguage } from './copy';

const migrations = join(import.meta.dir, '../../migrations');

function pushKinds() {
  const sql = readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(join(migrations, name), 'utf8'))
    .join('\n');
  const inserts = [
    ...sql.matchAll(/insert into private\.event_kinds \(kind, push\)\s+values([^;]+);/g),
  ];
  return inserts
    .flatMap((insert) => [...insert[1].matchAll(/\('([a-z]+\.[a-z_]+)', (true|false)\)/g)])
    .filter((match) => match[2] === 'true')
    .map((match) => match[1])
    .sort();
}

describe('pushCopy', () => {
  test('every kind that pushes has copy, and only those', () => {
    const kinds = pushKinds();
    expect(kinds.length).toBeGreaterThan(15);
    expect([...COPY_KINDS].sort()).toEqual(kinds);
  });

  test('every push kind has a title and body in every language', () => {
    for (const kind of COPY_KINDS)
      for (const language of LANGUAGES) {
        const copy = pushCopy(kind, language, {
          actorName: 'Bob',
          subject: { title: 'T', from: 'A', to: 'B' },
        });
        expect(copy?.title.length).toBeGreaterThan(0);
        expect(copy?.body).not.toContain('{name}');
      }
  });

  test('names the actor and the bounty in the recipient language', () => {
    expect(
      pushCopy('bounty.applied', 'zh-Hans', { actorName: '小林', subject: { title: '帮取快递' } }),
    ).toEqual({
      title: '帮取快递',
      body: '小林申请了你的悬赏',
    });
    expect(
      pushCopy('bounty.applied', 'ms', { actorName: '小林', subject: { title: '帮取快递' } })?.body,
    ).toBe('小林 memohon ganjaran anda');
  });

  test('a ride is titled by its route', () => {
    expect(
      pushCopy('ride.requested', 'en', {
        actorName: 'Devi',
        subject: { from: 'Sunway Geo', to: 'KLIA2' },
      })?.title,
    ).toBe('Sunway Geo → KLIA2');
  });

  test('a deleted actor or a missing subject still reads well', () => {
    expect(pushCopy('payment.marked_paid', 'en', { actorName: null, subject: {} })).toEqual({
      title: 'Payment',
      body: 'Someone says they paid. Did you receive it?',
    });
  });

  test('an unknown kind has no copy, and an unknown language falls back to zh-Hans', () => {
    expect(pushCopy('bounty.withdrawn', 'en', { actorName: 'Bob', subject: {} })).toBeNull();
    expect(toLanguage('fr')).toBe('zh-Hans');
    expect(toLanguage('ms')).toBe('ms');
  });

  test('a Latin name in Chinese copy is spaced like the app does, a Chinese name is not', () => {
    expect(pushCopy('bounty.applied', 'zh-Hans', { actorName: 'Lily', subject: {} })?.body).toBe(
      'Lily 申请了你的悬赏',
    );
    expect(pushCopy('ride.appealed', 'zh-Hans', { actorName: 'Devi', subject: {} })?.body).toBe(
      'Devi 说自己上车了，去确认一下',
    );
  });

  test('the ported spacing matches the app post-processor', () => {
    const samples = [
      'Lily帮我',
      '小林帮我',
      '帮Lily取快递',
      'Tapiro 提醒',
      'Bob说好',
      '小林 helped me',
    ];
    for (const sample of samples)
      for (const language of LANGUAGES)
        expect(latinSpacing(sample, language)).toBe(
          appLatinSpacing.process(sample, 'k', { lng: language }, undefined as never),
        );
  });
});
