import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COPY_KINDS, LANGUAGES, pushCopy, toLanguage } from './copy';

const migrations = join(import.meta.dir, '../../migrations');

function pushKinds() {
  const sql = readdirSync(migrations)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(join(migrations, name), 'utf8'))
    .join('\n');
  return [...sql.matchAll(/\('([a-z]+\.[a-z_]+)', (true|false)\)/g)]
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
      body: '小林 申请了你的悬赏',
    });
    expect(
      pushCopy('bounty.applied', 'ms', { actorName: '小林', subject: { title: '帮取快递' } })?.body,
    ).toBe('小林 memohon bounti anda');
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
});
