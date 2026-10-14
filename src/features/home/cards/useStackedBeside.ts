import { useCallback, useState } from 'react';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';

import { exceedsBeside } from '../beside';

export function useStackedBeside(resetKey: string) {
  const [stackedKey, setStackedKey] = useState<string | null>(null);
  const stacked = stackedKey === resetKey;
  const onTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!stacked && exceedsBeside(event.nativeEvent.lines.length)) setStackedKey(resetKey);
    },
    [stacked, resetKey],
  );
  return { stacked, onTextLayout };
}
