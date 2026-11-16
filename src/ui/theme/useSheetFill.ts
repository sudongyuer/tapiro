import { PlatformColor, useColorScheme } from 'react-native';

// The 问小貘 sheet is glass at its half detent: an opaque dark background sinks into it, a system fill lifts off it.
export function useSheetFill() {
  return PlatformColor(
    useColorScheme() === 'dark' ? 'secondarySystemFill' : 'secondarySystemBackground',
  );
}
