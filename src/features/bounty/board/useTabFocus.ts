import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

// The tab route also blurs when a root modal covers the tab bar; only a blur while the tab
// navigator stays focused means another tab was selected.
export function useTabFocus(onTabFocus: () => void) {
  const navigation = useNavigation();
  const latest = useRef(onTabFocus);

  useEffect(() => {
    latest.current = onTabFocus;
  }, [onTabFocus]);

  useEffect(() => {
    const tab = navigation.getParent();
    if (!tab) return;
    let leftTab = false;
    const offBlur = tab.addListener('blur', () => {
      leftTab = tab.getParent()?.isFocused() ?? true;
    });
    const offFocus = tab.addListener('focus', () => {
      if (leftTab) latest.current();
      leftTab = false;
    });
    return () => {
      offBlur();
      offFocus();
    };
  }, [navigation]);
}
