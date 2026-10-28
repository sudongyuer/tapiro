import { describe, expect, test } from 'bun:test';

import { createFreshness } from './freshness';

function counted() {
  let runs = 0;
  const run = () => {
    runs += 1;
  };
  const gate = createFreshness();
  return {
    gate: {
      tabState: gate.tabState,
      tabFocused: () => gate.tabFocused(run),
      screenFocus: (focused: boolean) => gate.screenFocus(focused, run),
      foreground: () => gate.foreground(run),
    },
    runs: () => runs,
  };
}

describe('board freshness', () => {
  test('a foreground while the board is on screen reloads at once', () => {
    const { gate, runs } = counted();
    gate.screenFocus(true);
    gate.foreground();
    expect(runs()).toBe(1);
  });

  test('a foreground while the board is covered reloads once on the next board focus', () => {
    const { gate, runs } = counted();
    gate.screenFocus(false);
    gate.foreground();
    gate.foreground();
    expect(runs()).toBe(0);
    gate.screenFocus(true);
    expect(runs()).toBe(1);
    gate.screenFocus(false);
    gate.screenFocus(true);
    expect(runs()).toBe(1);
  });

  test('returning from a push or a root sheet does not reload', () => {
    const { gate, runs } = counted();
    gate.screenFocus(false);
    gate.tabState(false, false);
    gate.tabFocused();
    gate.screenFocus(true);
    expect(runs()).toBe(0);
  });

  test('selecting another tab, then 悬赏 again, reloads once', () => {
    const { gate, runs } = counted();
    gate.tabState(true, false);
    gate.screenFocus(false);
    gate.tabFocused();
    gate.screenFocus(true);
    expect(runs()).toBe(1);
  });

  test('a sheet that closes onto another tab in one step still counts as leaving the tab', () => {
    const { gate, runs } = counted();
    gate.screenFocus(false);
    gate.tabState(false, false);
    gate.tabState(true, false);
    gate.tabFocused();
    expect(runs()).toBe(1);
  });

  test('a foreground missed on another tab and the tab switch reload once together', () => {
    const { gate, runs } = counted();
    gate.tabState(true, false);
    gate.screenFocus(false);
    gate.foreground();
    gate.tabFocused();
    gate.screenFocus(true);
    expect(runs()).toBe(1);
  });
});
