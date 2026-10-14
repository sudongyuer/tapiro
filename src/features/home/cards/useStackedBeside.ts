import { useCallback, useState } from 'react';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';

import { exceedsBeside } from '../beside';

export function useStackedBeside() {
  const [stacked, setStacked] = useState(false);
  const onTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (!stacked && exceedsBeside(event.nativeEvent.lines.length)) setStacked(true);
    },
    [stacked],
  );
  return { stacked, onTextLayout };
}
