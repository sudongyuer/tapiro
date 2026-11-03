import { describe, expect, test } from 'bun:test';

import { createStore } from '@/lib/store';

import { followReminderSync } from './reminderSync';

function fakeAppState() {
  const listeners = new Set<(state: string) => void>();
  return {
    currentState: 'active',
    addEventListener(_type: 'change', listener: (state: string) => void) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit: (...states: string[]) => states.forEach((state) => listeners.forEach((l) => l(state))),
  };
}

describe('ride reminder sync', () => {
  test('syncs at once, after a return from background and after any permission answer', () => {
    const appState = fakeAppState();
    const answers = createStore(0);
    let syncs = 0;
    const stop = followReminderSync(appState, answers, () => (syncs += 1));
    expect(syncs).toBe(1);
    appState.emit('inactive', 'active');
    expect(syncs).toBe(1);
    appState.emit('background', 'active');
    expect(syncs).toBe(2);
    answers.set(1);
    expect(syncs).toBe(3);
    stop();
    answers.set(2);
    appState.emit('background', 'active');
    expect(syncs).toBe(3);
  });
});
