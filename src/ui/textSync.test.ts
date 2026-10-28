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

  test('a read before the app write lands is not reported as typing', () => {
    let value = 'old';
    const queued: string[] = [];
    const native = {
      get: () => value,
      set: (text: string) => {
        queued.push(text);
      },
    };
    const reported: string[] = [];
    const sync = createTextSync(native, 'old');
    sync.listen((text) => reported.push(text));
    sync.set('');
    expect(sync.sync()).toBe('');
    value = queued.shift() ?? value;
    expect(sync.sync()).toBe('');
    value = 'a';
    expect(sync.sync()).toBe('a');
    expect(reported).toEqual(['a']);
  });

  test('typing over a write that has not landed is reported', () => {
    let value = 'old';
    const native = { get: () => value, set: () => {} };
    const reported: string[] = [];
    const sync = createTextSync(native, 'old');
    sync.listen((text) => reported.push(text));
    sync.set('');
    value = 'oldx';
    expect(sync.sync()).toBe('oldx');
    expect(reported).toEqual(['oldx']);
  });

  test('a second write before the first lands does not report the first as typing', () => {
    let value = 'old';
    const queued: string[] = [];
    const native = {
      get: () => value,
      set: (text: string) => {
        queued.push(text);
      },
    };
    const reported: string[] = [];
    const sync = createTextSync(native, 'old');
    sync.listen((text) => reported.push(text));
    sync.set('a');
    sync.set('b');
    value = queued.shift() ?? value;
    expect(sync.sync()).toBe('b');
    value = queued.shift() ?? value;
    expect(sync.sync()).toBe('b');
    value = 'bc';
    expect(sync.sync()).toBe('bc');
    expect(reported).toEqual(['bc']);
  });

  test('a released native view keeps the last value', () => {
    const { native, reported, sync } = setup('a');
    native.get = () => {
      throw new Error('released');
    };
    expect(sync.sync()).toBe('a');
    expect(reported).toEqual([]);
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
