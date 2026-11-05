import { describe, expect, test } from 'bun:test';

import { bubbleImageSize } from './imageSize';

describe('bubble image size', () => {
  test('a portrait photo keeps its shape inside the height limit', () => {
    expect(bubbleImageSize(1536, 2048)).toEqual({ width: 210, height: 280, cropped: false });
  });

  test('a landscape photo takes the full width', () => {
    expect(bubbleImageSize(2048, 1536)).toEqual({ width: 220, height: 165, cropped: false });
  });

  test('a very tall image is cropped to 1:3 and never thinner than a tap target', () => {
    const size = bubbleImageSize(410, 2048);
    expect(size.cropped).toBe(true);
    expect(size.height / size.width).toBeCloseTo(3, 1);
    expect(size.width).toBeGreaterThanOrEqual(72);
  });

  test('a very wide image is cropped to 3:1', () => {
    const size = bubbleImageSize(2048, 400);
    expect(size).toEqual({ width: 220, height: 73, cropped: true });
  });

  test('a tiny image is not blown up to the full width, but stays a 72 pt square', () => {
    expect(bubbleImageSize(24, 24)).toEqual({ width: 72, height: 72, cropped: false });
  });

  test('a small screenshot keeps its shape and grows only to the 72 pt minimum', () => {
    expect(bubbleImageSize(200, 100)).toEqual({ width: 144, height: 72, cropped: false });
  });
});
