import { describe, expect, test } from 'bun:test';

import { createAnswerOrder } from './answerOrder';

describe('answer order', () => {
  test('an older answer after a newer one is dropped', () => {
    const order = createAnswerOrder();
    const first = order.start();
    const second = order.start();
    expect(order.succeeded(second)).toBe('ready');
    expect(order.succeeded(first)).toBeNull();
  });

  test('a newer failure keeps a good older answer, marked stale', () => {
    const order = createAnswerOrder();
    const first = order.start();
    const second = order.start();
    expect(order.failed(second)).toBe(true);
    expect(order.succeeded(first)).toBe('stale');
  });

  test('a failure older than the applied answer changes nothing', () => {
    const order = createAnswerOrder();
    const first = order.start();
    const second = order.start();
    expect(order.succeeded(second)).toBe('ready');
    expect(order.failed(first)).toBe(false);
  });

  test('a later success clears the stale mark', () => {
    const order = createAnswerOrder();
    order.failed(order.start());
    expect(order.succeeded(order.start())).toBe('ready');
  });
});
