import { describe, expect, test } from 'bun:test';

import { onReturnToForeground } from './foreground';

function fakeAppState(currentState: string | null = 'active') {
  const listeners = new Set<(state: string) => void>();
  return {
    currentState,
    addEventListener(_type: 'change', listener: (state: string) => void) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    emit: (...states: string[]) => states.forEach((state) => listeners.forEach((l) => l(state))),
    count: () => listeners.size,
  };
}

describe('return to the foreground', () => {
  test('inactive → active (launch, alerts, Control Center) does nothing', () => {
    const appState = fakeAppState();
    let runs = 0;
    onReturnToForeground(appState, () => (runs += 1));
    appState.emit('active', 'inactive', 'active', 'inactive', 'active');
    expect(runs).toBe(0);
  });

  test('background → active fires once, also through inactive', () => {
    const appState = fakeAppState();
    let runs = 0;
    onReturnToForeground(appState, () => (runs += 1));
    appState.emit('inactive', 'background', 'active', 'active');
    expect(runs).toBe(1);
    appState.emit('inactive', 'background', 'inactive', 'active');
    expect(runs).toBe(2);
  });

  test('subscribing while in the background fires on the first active', () => {
    const appState = fakeAppState('background');
    let runs = 0;
    onReturnToForeground(appState, () => (runs += 1));
    appState.emit('active');
    expect(runs).toBe(1);
  });

  test('removing the listener stops it', () => {
    const appState = fakeAppState();
    let runs = 0;
    const stop = onReturnToForeground(appState, () => (runs += 1));
    stop();
    appState.emit('background', 'active');
    expect(runs).toBe(0);
    expect(appState.count()).toBe(0);
  });
});
