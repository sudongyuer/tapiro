export function createFreshness() {
  let onScreen = true;
  let missed = false;
  let leftTab = false;

  function catchUp(run: () => void) {
    if (!missed && !leftTab) return;
    missed = false;
    leftTab = false;
    run();
  }

  return {
    tabState(tabsFocused: boolean, selected: boolean) {
      if (tabsFocused && !selected) leftTab = true;
    },
    tabFocused: catchUp,
    screenFocus(focused: boolean, run: () => void) {
      onScreen = focused;
      if (focused) catchUp(run);
    },
    foreground(run: () => void) {
      if (onScreen) run();
      else missed = true;
    },
  };
}
