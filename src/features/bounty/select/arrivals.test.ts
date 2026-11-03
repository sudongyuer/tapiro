import { describe, expect, test } from 'bun:test';

import { arrivedIds } from './arrivals';

describe('arrived applicants', () => {
  test('the first list animates nothing', () => {
    expect(arrivedIds(null, ['jie', 'hana'])).toEqual([]);
  });

  test('only rows that were not shown before arrive', () => {
    expect(arrivedIds(['jie', 'hana'], ['mei', 'jie', 'hana'])).toEqual(['mei']);
    expect(arrivedIds([], ['jie'])).toEqual(['jie']);
  });

  test('a withdrawn row and a reorder arrive nothing', () => {
    expect(arrivedIds(['jie', 'hana'], ['hana'])).toEqual([]);
    expect(arrivedIds(['jie', 'hana'], ['hana', 'jie'])).toEqual([]);
  });
});
