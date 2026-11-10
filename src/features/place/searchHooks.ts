import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { SearchBarCommands } from 'react-native-screens';
import type { PlaceSuggestion } from 'tapiro-kit';

import type { usePlaceSearch } from './usePlaceSearch';

const NO_ITEMS: PlaceSuggestion[] = [];

export function useFocusedSearchBar() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const searchBar = useRef<SearchBarCommands>(null);
  useEffect(
    () =>
      navigation.addListener('transitionEnd', (event) => {
        if (!event.data.closing) searchBar.current?.focus();
      }),
    [navigation],
  );
  return searchBar;
}

export function useShownItems(state: ReturnType<typeof usePlaceSearch>['state']) {
  const [items, setItems] = useState(NO_ITEMS);
  const next = state.kind === 'ready' ? state.items : state.kind === 'loading' ? items : NO_ITEMS;
  if (next !== items) setItems(next);
  return next;
}
