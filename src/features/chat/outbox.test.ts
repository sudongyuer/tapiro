import { describe, expect, test } from 'bun:test';

import { createOutbox, type SettingsLike } from './outbox';
import type { PendingMessage } from './types';

function memorySettings(initial: Record<string, unknown> = {}): SettingsLike & {
  values: Record<string, unknown>;
} {
  const values = { ...initial };
  return { values, get: (key) => values[key], set: (next) => Object.assign(values, next) };
}

const entry = (clientId: string, state: PendingMessage['state'] = 'sending'): PendingMessage => ({
  clientId,
  threadId: 't1',
  body: `正文 ${clientId}`,
  writtenAt: '2026-11-06T01:00:00.000Z',
  state,
  failure: state === 'failed' ? 'blocked' : null,
});

describe('chat outbox', () => {
  test('an entry is on the device as soon as it is put', () => {
    const settings = memorySettings();
    createOutbox(settings).put('u1', entry('c1'));
    expect(JSON.parse(String(settings.values['tapiro.chatOutbox.u1']))).toHaveLength(1);
  });

  test('after a restart a message that was sending comes back failed, never sending', () => {
    const settings = memorySettings();
    const before = createOutbox(settings);
    before.put('u1', entry('c1'));
    before.put('u1', entry('c2', 'failed'));
    const after = createOutbox(settings).list('u1');
    expect(after.map((item) => [item.clientId, item.state, item.failure])).toEqual([
      ['c1', 'failed', 'failed'],
      ['c2', 'failed', 'blocked'],
    ]);
    expect(after[0].body).toBe('正文 c1');
  });

  test('putting the same client id again replaces the entry', () => {
    const outbox = createOutbox(memorySettings());
    outbox.put('u1', entry('c1'));
    outbox.put('u1', entry('c1', 'failed'));
    expect(outbox.list('u1').map((item) => item.state)).toEqual(['failed']);
  });

  test('entries are kept per user and cleared per user', () => {
    const settings = memorySettings();
    const outbox = createOutbox(settings);
    outbox.put('u1', entry('c1'));
    outbox.put('u2', entry('c2'));
    outbox.clear('u1');
    expect(outbox.list('u1')).toEqual([]);
    expect(outbox.list('u2').map((item) => item.clientId)).toEqual(['c2']);
    expect(settings.values['tapiro.chatOutbox.u1']).toBe('');
  });

  test('removing delivered entries keeps the rest', () => {
    const outbox = createOutbox(memorySettings());
    outbox.put('u1', entry('c1'));
    outbox.put('u1', entry('c2'));
    outbox.remove('u1', ['c1']);
    expect(outbox.list('u1').map((item) => item.clientId)).toEqual(['c2']);
  });

  test('unreadable storage reads as no entries and skips malformed rows', () => {
    expect(createOutbox(memorySettings({ 'tapiro.chatOutbox.u1': '{oops' })).list('u1')).toEqual(
      [],
    );
    const mixed = JSON.stringify([{ clientId: 'c1' }, entry('c2')]);
    expect(
      createOutbox(memorySettings({ 'tapiro.chatOutbox.u1': mixed }))
        .list('u1')
        .map((item) => item.clientId),
    ).toEqual(['c2']);
  });
});
