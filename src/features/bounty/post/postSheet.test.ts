import { describe, expect, test } from 'bun:test';

import { closePostSheet, registerPostSheet } from './postSheet';

describe('post sheet closer', () => {
  test('closes the open sheet once', () => {
    let closed = 0;
    const unregister = registerPostSheet(() => (closed += 1));
    expect(closePostSheet()).toBe(true);
    expect(closePostSheet()).toBe(false);
    expect(closed).toBe(1);
    unregister();
  });

  test('an older sheet unregistering does not drop the newer one', () => {
    let closed = '';
    const first = registerPostSheet(() => (closed = 'first'));
    registerPostSheet(() => (closed = 'second'));
    first();
    expect(closePostSheet()).toBe(true);
    expect(closed).toBe('second');
  });

  test('without an open sheet nothing happens', () => {
    expect(closePostSheet()).toBe(false);
  });
});
