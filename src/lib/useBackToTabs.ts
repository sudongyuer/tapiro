import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useCallback } from 'react';

// Call from a screen on the root stack (a root sheet or the tabs layout): screens and sheets opened over the tabs
// would otherwise cover whatever is opened in a tab next.
export function useBackToTabs() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  return useCallback(() => navigation.popTo('(tabs)'), [navigation]);
}
