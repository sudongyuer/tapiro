import { describe, expect, test } from 'bun:test';

import { releaseOrder, renderBoard } from './story-map-board.mjs';

const story = (id: string, release: string) => ({
  id,
  title: id,
  status: 'planned',
  release,
  criteria: [],
});

describe('story map board', () => {
  test('orders releases v1, v2, then later', () => {
    expect(releaseOrder([story('a.x', 'later'), story('a.y', 'v2'), story('a.z', 'v1')])).toEqual([
      'v1',
      'v2',
      'later',
    ]);
  });

  test('draws one band per release with its own label', () => {
    const html = renderBoard([
      {
        name: '首页',
        stories: [story('home.a', 'v1'), story('home.b', 'v2'), story('home.c', 'later')],
      },
    ]);
    expect(html).toContain('v1 第一版');
    expect(html).toContain('v2 第 2 版');
    expect(html).toContain('later 以后');
    expect(html.match(/class="release"/g)?.length).toBe(3);
  });
});
