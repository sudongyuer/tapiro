import { describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { resources } from '@/lib/i18n/resources';

import { createFixtureStickerService } from './fixture';
import {
  bountyCategory,
  newestFirst,
  stickerArt,
  type Sticker,
  type StickerService,
} from './model';
import { createStickerStore } from './store';

const USER = 'user-1';

function sticker(id: string, earnedAt: string, itemKind: Sticker['itemKind'] = 'bounty'): Sticker {
  return { id, paymentId: `p-${id}`, itemKind, category: null, title: id, earnedAt };
}

describe('sticker art', () => {
  test('a ride earns a car sticker; a bounty with a category earns its category sticker; without one, a 小貘 sticker', () => {
    expect(stickerArt({ itemKind: 'ride', category: null })).toEqual({ kind: 'car' });
    expect(stickerArt({ itemKind: 'bounty', category: 'move' })).toEqual({
      kind: 'category',
      category: 'move',
    });
    expect(stickerArt({ itemKind: 'bounty', category: null })).toEqual({ kind: 'mascot' });
  });

  test('an unknown category from the server falls back to the 小貘 sticker', () => {
    expect(stickerArt({ itemKind: 'bounty', category: 'parcel' })).toEqual({ kind: 'mascot' });
    expect(bountyCategory('Pickup')).toBeNull();
    expect(bountyCategory('pickup')).toBe('pickup');
  });

  test('stickers list newest first', () => {
    const list = newestFirst([
      sticker('old', '2026-10-01T00:00:00Z'),
      sticker('new', '2026-10-20T00:00:00Z'),
      sticker('mid', '2026-10-10T00:00:00Z'),
    ]);
    expect(list.map((item) => item.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('sticker count copy', () => {
  const t = (lng: string) => {
    const i18n = createInstance();
    i18n.init({ resources, lng, initAsync: false, interpolation: { escapeValue: false } });
    return i18n.t;
  };

  test('English pluralises the count; Chinese and Malay do not', () => {
    expect(t('en')('stickers.count', { count: 1 })).toBe('1 sticker');
    expect(t('en')('stickers.count', { count: 7 })).toBe('7 stickers');
    expect(t('zh-Hans')('stickers.count', { count: 7 })).toBe('7 张');
    expect(t('ms')('stickers.count', { count: 1 })).toBe('1 pelekat');
  });
});

describe('sticker store', () => {
  test('loads, then a settle shows the new sticker first', async () => {
    const service = createFixtureStickerService('seven');
    const store = createStickerStore(service);
    const loading = store.ensureLoaded(USER);
    expect(store.getSnapshot().status).toBe('loading');
    await loading;
    const ready = store.getSnapshot();
    expect(ready.status === 'ready' && ready.stickers.length).toBe(7);
    expect(
      service.earn({ paymentId: 'pay-1', itemKind: 'ride', category: null, title: '拼车回 YC' }),
    ).toBe(8);
    expect(
      service.earn({ paymentId: 'pay-1', itemKind: 'ride', category: null, title: '拼车回 YC' }),
    ).toBe(8);
    await store.reload(USER);
    const after = store.getSnapshot();
    expect(after.status === 'ready' && after.stickers.map((item) => item.paymentId)[0]).toBe(
      'pay-1',
    );
    expect(after.status === 'ready' && after.stickers.length).toBe(8);
  });

  test('a failed load is failed, never an empty book, and a retry loads it', async () => {
    let fail = true;
    const service: StickerService = {
      async list() {
        if (fail) throw new Error('offline');
        return [sticker('a', '2026-10-01T00:00:00Z')];
      },
    };
    const store = createStickerStore(service);
    await store.ensureLoaded(USER);
    expect(store.getSnapshot()).toEqual({ status: 'failed', userId: USER });
    fail = false;
    await store.ensureLoaded(USER);
    const state = store.getSnapshot();
    expect(state.status === 'ready' && state.stickers.length).toBe(1);
  });

  test('a slow load for an earlier user never overwrites the current one', async () => {
    let release: (value: Sticker[]) => void = () => undefined;
    const service: StickerService = {
      list: (userId) =>
        userId === 'slow'
          ? new Promise((resolve) => {
              release = resolve;
            })
          : Promise.resolve([]),
    };
    const store = createStickerStore(service);
    const slow = store.ensureLoaded('slow');
    await store.ensureLoaded(USER);
    release([sticker('x', '2026-10-01T00:00:00Z')]);
    await slow;
    expect(store.getSnapshot()).toEqual({ status: 'ready', userId: USER, stickers: [] });
  });

  test('signing out forgets the stickers', async () => {
    const store = createStickerStore(createFixtureStickerService('one'));
    await store.ensureLoaded(USER);
    store.clear();
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
  });

  test('a foreground refresh keeps the book on screen and marks it stale when it fails', async () => {
    let fail = false;
    const seen: string[] = [];
    const service: StickerService = {
      async list() {
        if (fail) throw new Error('offline');
        return [sticker('a', '2026-10-01T00:00:00Z')];
      },
    };
    const store = createStickerStore(service);
    await store.ensureLoaded(USER);
    store.subscribe(() => seen.push(store.getSnapshot().status));
    fail = true;
    await store.refresh(USER);
    expect(seen).not.toContain('loading');
    const state = store.getSnapshot();
    expect(state.status).toBe('stale');
    expect(state.status === 'stale' && state.stickers.length).toBe(1);
    fail = false;
    await store.refresh(USER);
    expect(store.getSnapshot().status).toBe('ready');
  });

  test('signing out (the session view unmounting) leaves no stickers behind', async () => {
    const store = createStickerStore(createFixtureStickerService('seven'));
    let onChange: (state: string) => void = () => undefined;
    const appState = {
      addEventListener: (_: 'change', listener: (state: string) => void) => {
        onChange = listener;
        return { remove: () => undefined };
      },
    };
    const stop = store.follow(USER, appState);
    await store.ensureLoaded(USER);
    expect(store.getSnapshot().status).toBe('ready');
    onChange('active');
    expect(store.getSnapshot().status).toBe('ready');
    stop();
    expect(store.getSnapshot()).toEqual({ status: 'idle' });
  });
});
