import { useIsFocused, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createFreshness } from './freshness';

// A root sheet also blurs the tab route, and a sheet dismissal plus a tab change can land in one
// commit with no blur in between, so leaving the tab is read from the tab navigator's state.
export function useFreshness(run: () => void) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const latest = useRef(run);
  const [gate] = useState(createFreshness);

  useEffect(() => {
    latest.current = run;
  }, [run]);

  useEffect(() => {
    gate.screenFocus(focused, () => latest.current());
  }, [gate, focused]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') gate.foreground(() => latest.current());
    });
    return () => subscription.remove();
  }, [gate]);

  useEffect(() => {
    const tab = navigation.getParent();
    if (!tab) return;
    const check = () => gate.tabState(tab.getParent()?.isFocused() ?? true, tab.isFocused());
    const offState = tab.addListener('state', check);
    const offBlur = tab.addListener('blur', check);
    const offFocus = tab.addListener('focus', () => gate.tabFocused(() => latest.current()));
    return () => {
      offState();
      offBlur();
      offFocus();
    };
  }, [navigation, gate]);
}
