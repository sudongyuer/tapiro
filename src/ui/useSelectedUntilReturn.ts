import { useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { EASE_ENTER } from '@/ui/theme/motion';
import { vars } from '@/ui/theme/tokens';

const FADE = {
  duration: vars['--duration-fade'],
  easing: EASE_ENTER,
  reduceMotion: ReduceMotion.Never,
} as const;

export function useSelectedUntilReturn() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const [selected, setSelected] = useState(false);
  const shown: SharedValue<number> = useSharedValue(0);
  const away = useRef(false);

  useEffect(() => {
    const fadeTo = (value: number) => {
      setSelected(value === 1);
      shown.set(withTiming(value, FADE));
    };
    const offTransition = navigation.addListener('transitionStart', (event) => {
      if (away.current) fadeTo(event.data.closing ? 1 : 0);
    });
    const offFocus = navigation.addListener('focus', () => {
      if (!away.current && shown.get() === 0) return;
      away.current = false;
      fadeTo(0);
    });
    return () => {
      offTransition();
      offFocus();
    };
  }, [navigation, shown]);

  const select = useCallback(() => {
    away.current = true;
    setSelected(true);
    shown.set(1);
  }, [shown]);

  const highlight = useAnimatedStyle(() => ({ opacity: shown.get() }));

  return { selected, select, highlight };
}
