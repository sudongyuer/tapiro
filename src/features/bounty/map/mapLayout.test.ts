import { describe, expect, test } from 'bun:test';

import {
  CARD_EDGE,
  CARD_MAX_WIDTH,
  PIN_SPAN,
  TAIL,
  cardWidth,
  moreChip,
  placeCard,
} from './mapLayout';

const MAP = { width: 370, height: 520 };
const CARD = { width: 340, height: 180 };

describe('placeCard', () => {
  test('sits above the pin with the tail tip on the pin', () => {
    const placed = placeCard({ x: 185, y: 300 }, MAP, CARD);
    expect(placed.side).toBe('above');
    expect(placed.top + CARD.height + TAIL).toBeLessThanOrEqual(300);
    expect(placed.left + placed.tailX).toBe(185);
    expect(placed.origin).toEqual({ x: placed.tailX, y: CARD.height + TAIL });
  });

  test('stays inside the map near an edge and keeps the tail at the pin', () => {
    const placed = placeCard({ x: 40, y: 300 }, MAP, CARD);
    expect(placed.left).toBe(CARD_EDGE);
    expect(placed.left + placed.tailX).toBe(40);
    const right = placeCard({ x: 330, y: 300 }, MAP, CARD);
    expect(right.left + CARD.width).toBe(MAP.width - CARD_EDGE);
    expect(right.left + right.tailX).toBe(330);
  });

  test('keeps the tail off the rounded corner when the pin is at the very edge', () => {
    const placed = placeCard({ x: 2, y: 300 }, MAP, CARD);
    expect(placed.tailX).toBeGreaterThan(TAIL);
  });

  test('goes below the pin, tail on top, when there is no room above', () => {
    const placed = placeCard({ x: 185, y: 60 }, MAP, CARD);
    expect(placed.side).toBe('below');
    expect(placed.top).toBeGreaterThanOrEqual(60 + PIN_SPAN);
    expect(placed.origin.y).toBe(-TAIL);
  });

  test('never leaves the map when neither side fits', () => {
    const placed = placeCard({ x: 185, y: 120 }, { width: 370, height: 260 }, CARD);
    expect(placed.top).toBeGreaterThanOrEqual(CARD_EDGE);
    expect(placed.top + CARD.height).toBeLessThanOrEqual(260 - CARD_EDGE);
  });
});

describe('cardWidth', () => {
  test('leaves the edge margin on a narrow map and caps on a wide one', () => {
    expect(cardWidth(320)).toBe(320 - CARD_EDGE * 2);
    expect(cardWidth(800)).toBe(CARD_MAX_WIDTH);
  });
});

describe('moreChip', () => {
  const ready = (over: Partial<Parameters<typeof moreChip>[0] & { kind: 'ready' }> = {}) => ({
    kind: 'ready' as const,
    rows: Array.from({ length: 20 }),
    total: 45,
    next: { after: 20 },
    page: 'idle' as const,
    ...over,
  });

  test('counts what the map shows against the total and the next page', () => {
    expect(moreChip(ready(), 20)).toEqual({ shown: 20, total: '45', count: 20, page: 'idle' });
    expect(moreChip(ready({ rows: Array.from({ length: 40 }) }), 20)?.count).toBe(5);
  });

  test('is absent when every bounty is loaded or the board is not ready', () => {
    expect(moreChip(ready({ next: null }), 20)).toBeNull();
    expect(moreChip({ kind: 'loading' }, 20)).toBeNull();
    expect(moreChip({ kind: 'failed' }, 20)).toBeNull();
  });

  test('never claims the loaded pins are all when the total is unknown', () => {
    expect(moreChip(ready({ total: null }), 20)).toEqual({
      shown: 20,
      total: '20+',
      count: 20,
      page: 'idle',
    });
  });

  test('carries the page state for the busy and failed chip', () => {
    expect(moreChip(ready({ page: 'failed' }), 20)?.page).toBe('failed');
  });
});
