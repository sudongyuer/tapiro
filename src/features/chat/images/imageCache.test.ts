import { describe, expect, test } from 'bun:test';

import { createImageCache } from './imageCache';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('chat image cache', () => {
  test('a path loads once and is shared by every bubble that shows it', async () => {
    const loads: string[] = [];
    const cache = createImageCache(async (path) => {
      loads.push(path);
      return `file:///${path}`;
    });
    expect(cache.get('a.jpg')).toEqual({ status: 'loading' });
    cache.get('a.jpg');
    await settle();
    expect(cache.get('a.jpg')).toEqual({ status: 'ready', uri: 'file:///a.jpg' });
    expect(loads).toEqual(['a.jpg']);
  });

  test('a failed load stays failed until retried, and the retry loads again', async () => {
    let fail = true;
    const cache = createImageCache(async (path) => {
      if (fail) throw new Error('offline');
      return path;
    });
    let changes = 0;
    cache.subscribe(() => changes++);
    cache.get('a.jpg');
    await settle();
    expect(cache.get('a.jpg')).toEqual({ status: 'failed' });
    fail = false;
    cache.retry('a.jpg');
    expect(cache.peek('a.jpg')).toEqual({ status: 'loading' });
    await settle();
    expect(cache.peek('a.jpg')).toEqual({ status: 'ready', uri: 'a.jpg' });
    expect(changes).toBe(3);
  });

  test('retry does nothing for an image that is loading or loaded', async () => {
    let loads = 0;
    const cache = createImageCache(async (path) => {
      loads++;
      return path;
    });
    cache.get('a.jpg');
    cache.retry('a.jpg');
    await settle();
    cache.retry('a.jpg');
    expect(loads).toBe(1);
  });
});
