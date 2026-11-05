import { describe, expect, test } from 'bun:test';

import { createChatStore } from './chatStore';
import {
  fakeService,
  ME,
  memorySettings,
  msg,
  noAppState,
  settle,
  setup,
} from './chatStoreHarness';
import { createOutbox } from './outbox';
import type { PendingImage } from './types';

const PHOTO: PendingImage = { file: 'a1.jpg', width: 1536, height: 2048 };
const PATH = `t1/${ME}/new1.jpg`;

const stored = () => ({
  ...msg(9, ME, 'new1'),
  threadId: 't1',
  body: '',
  image: { path: PATH, width: 1536, height: 2048 },
});

describe('sending an image', () => {
  test('the image is on the device with the message before the upload, under a path from the client id', () => {
    const ctx = setup();
    expect(ctx.store.send('t1', '', PHOTO)).toBe('new1');
    expect(ctx.outbox.list(ME)).toMatchObject([
      { clientId: 'new1', image: PHOTO, state: 'sending' },
    ]);
    expect(ctx.named('send')[0].args).toEqual(['t1', 'new1', '', { ...PHOTO, path: PATH }]);
  });

  test('an image needs no text, but text beside it still has the length limit', () => {
    const ctx = setup();
    expect(ctx.store.send('t1', '  ', PHOTO)).toBe('new1');
    expect(ctx.store.send('t1', '好'.repeat(2001), PHOTO)).toBeNull();
    expect(ctx.store.send('t1', '  ')).toBeNull();
  });

  test('a failed upload keeps the image file and retries only on the tap, with the same path', async () => {
    const ctx = setup();
    ctx.store.send('t1', '', PHOTO);
    ctx.queues.send[0].resolve({ ok: false, failure: 'failed' });
    await settle();
    expect(ctx.store.getSnapshot().pending).toMatchObject([{ state: 'failed', image: PHOTO }]);
    expect(ctx.dropped).toEqual([]);
    expect(ctx.named('send')).toHaveLength(1);
    expect(ctx.store.retry('new1')).toBe(true);
    expect(ctx.named('send').map((entry) => entry.args[3])).toEqual([
      { ...PHOTO, path: PATH },
      { ...PHOTO, path: PATH },
    ]);
  });

  test('once stored, the file moves to the image cache under the stored path', async () => {
    const ctx = setup();
    ctx.store.send('t1', '', PHOTO);
    ctx.queues.send[0].resolve({ ok: true, message: stored() });
    await settle();
    expect(ctx.kept).toEqual([['a1.jpg', PATH]]);
    expect(ctx.outbox.list(ME)).toEqual([]);
  });

  test('deleting a failed image message deletes its file', async () => {
    const ctx = setup();
    ctx.store.send('t1', '', PHOTO);
    ctx.queues.send[0].resolve({ ok: false, failure: 'blocked' });
    await settle();
    ctx.store.discard('new1');
    expect(ctx.dropped).toEqual(['a1.jpg']);
    expect(ctx.kept).toEqual([]);
  });

  test('after a restart an image that was sending comes back failed with its file, and is not sent', () => {
    const settings = memorySettings();
    const before = setup(settings);
    before.store.send('t1', '', PHOTO);
    const fake = fakeService();
    const after = createChatStore({
      service: fake.service,
      outbox: createOutbox(settings),
      newId: () => 'x',
    });
    after.follow(ME, noAppState as never);
    expect(after.getSnapshot().pending).toMatchObject([
      { clientId: 'new1', image: PHOTO, state: 'failed', failure: 'failed' },
    ]);
    expect(fake.named('send')).toHaveLength(0);
  });
});
