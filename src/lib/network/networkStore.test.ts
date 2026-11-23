import { describe, expect, test } from 'bun:test';

import { createNetworkStore, type NetworkReading, type NetworkSource } from './networkStore';

function fakeSource(first: NetworkReading) {
  let resolveRead: (reading: NetworkReading) => void = () => undefined;
  let emit: ((reading: NetworkReading) => void) | null = null;
  let stops = 0;
  const source: NetworkSource = {
    read: () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    listen(on) {
      emit = on;
      return () => {
        stops += 1;
        emit = null;
      };
    },
  };
  return {
    source,
    answerRead: () => resolveRead(first),
    emit: (reading: NetworkReading) => emit?.(reading),
    stops: () => stops,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('network store', () => {
  test('starts online, then follows the first reading', async () => {
    const fake = fakeSource({ isConnected: false });
    const store = createNetworkStore(fake.source);
    const changes: boolean[] = [];
    store.subscribe(() => changes.push(store.getSnapshot()));
    expect(store.getSnapshot()).toBe(false);
    fake.answerRead();
    await settle();
    expect(store.getSnapshot()).toBe(true);
    expect(changes).toEqual([true]);
  });

  test('an unknown reading never counts as offline', async () => {
    const fake = fakeSource({});
    const store = createNetworkStore(fake.source);
    store.subscribe(() => undefined);
    fake.answerRead();
    await settle();
    expect(store.getSnapshot()).toBe(false);
  });

  test('a late first reading does not overwrite a newer event', async () => {
    const fake = fakeSource({ isConnected: false });
    const store = createNetworkStore(fake.source);
    store.subscribe(() => undefined);
    fake.emit({ isConnected: true });
    fake.answerRead();
    await settle();
    expect(store.getSnapshot()).toBe(false);
  });

  test('losing and regaining the connection flips the state each time', () => {
    const fake = fakeSource({ isConnected: true });
    const store = createNetworkStore(fake.source);
    store.subscribe(() => undefined);
    fake.emit({ isConnected: false });
    expect(store.getSnapshot()).toBe(true);
    fake.emit({ isConnected: true });
    expect(store.getSnapshot()).toBe(false);
  });

  test('stops listening when the last subscriber leaves', () => {
    const fake = fakeSource({ isConnected: true });
    const store = createNetworkStore(fake.source);
    const first = store.subscribe(() => undefined);
    const second = store.subscribe(() => undefined);
    first();
    expect(fake.stops()).toBe(0);
    second();
    expect(fake.stops()).toBe(1);
  });

  test('a new subscriber after everyone left starts online again', () => {
    const fake = fakeSource({ isConnected: true });
    const store = createNetworkStore(fake.source);
    const first = store.subscribe(() => undefined);
    fake.emit({ isConnected: false });
    first();
    store.subscribe(() => undefined);
    expect(store.getSnapshot()).toBe(false);
  });
});
