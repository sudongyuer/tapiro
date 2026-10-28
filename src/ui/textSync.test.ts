import { describe, expect, test } from 'bun:test';

import { createTextSync } from './textSync';

function nativeField(initial: string) {
  let value = initial;
  return {
    get: () => value,
    set: (text: string) => {
      value = text;
    },
    type: (text: string) => {
      value += text;
    },
  };
}

function setup(initial = '') {
  const native = nativeField(initial);
  const reported: string[] = [];
  const sync = createTextSync(native, initial);
  sync.listen((text) => reported.push(text));
  return { native, reported, sync };
}

describe('createTextSync', () => {
  test('a keystroke that arrived without its event is reported on the next sync', () => {
    const { native, reported, sync } = setup('ab');
    native.type('c');
    expect(sync.sync()).toBe('abc');
    expect(reported).toEqual(['abc']);
  });

  test('a cursor move or focus change without new text reports nothing', () => {
    const { reported, sync } = setup('ab');
    expect(sync.sync()).toBe('ab');
    expect(sync.sync()).toBe('ab');
    expect(reported).toEqual([]);
  });

  test('each distinct value is reported once, however many events carry it', () => {
    const { native, reported, sync } = setup();
    native.type('a');
    sync.sync();
    sync.sync();
    native.type('b');
    sync.sync();
    expect(reported).toEqual(['a', 'ab']);
  });

  test('a value written from the app is not reported back as typing', () => {
    const { native, reported, sync } = setup('old');
    sync.set('');
    expect(native.get()).toBe('');
    expect(sync.sync()).toBe('');
    expect(reported).toEqual([]);
  });

  test('the latest listener receives the report', () => {
    const { native, reported, sync } = setup();
    const latest: string[] = [];
    sync.listen((text) => latest.push(text));
    native.type('a');
    sync.sync();
    expect(reported).toEqual([]);
    expect(latest).toEqual(['a']);
  });

  test('a re-attached field syncs again', () => {
    const { native, reported, sync } = setup();
    sync.attach()();
    sync.attach();
    native.type('a');
    expect(sync.sync()).toBe('a');
    expect(reported).toEqual(['a']);
  });

  test('after detach nothing is read or reported', () => {
    const { native, reported, sync } = setup('a');
    sync.attach()();
    native.get = () => {
      throw new Error('released');
    };
    expect(sync.sync()).toBe('a');
    expect(reported).toEqual([]);
  });
});
