import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, type View } from 'react-native';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { StickerFlight } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';

import { runSettledCollect, type SettledExit } from './settledCollect';

const ME_TAB_ID = 'tab-me';
const EASE_ENTER = Easing.bezier(0.23, 1, 0.32, 1);
const EXIT = {
  leave: { duration: 220, easing: EASE_ENTER, reduceMotion: ReduceMotion.Never, rise: 8 },
  fade: {
    duration: 200,
    easing: Easing.bezier(0, 0, 0.58, 1),
    reduceMotion: ReduceMotion.Never,
    rise: 0,
  },
} as const;

export function useSettledCollect({
  onCollect,
  onLeave,
}: {
  onCollect: () => void;
  onLeave: () => void;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion() || uiVerifyReduceMotion;
  const sticker = useRef<View>(null);
  const started = useRef(false);
  const [collecting, setCollecting] = useState(false);
  const opacity = useSharedValue(1);
  const lift = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: lift.get() }],
  }));

  const exit = (kind: SettledExit) =>
    new Promise<void>((resolve) => {
      const { rise, ...timing } = EXIT[kind];
      lift.set(withTiming(rise, timing));
      opacity.set(
        withTiming(0, timing, () => {
          scheduleOnRN(resolve);
        }),
      );
    });

  const fly = () => {
    const viewTag = findNodeHandle(sticker.current);
    if (viewTag === null) return Promise.resolve({ landed: false });
    return StickerFlight.flyToTab({ viewTag, tabId: ME_TAB_ID, reduceMotion });
  };

  const collect = () => {
    if (started.current) return;
    started.current = true;
    setCollecting(true);
    void runSettledCollect(
      {
        collect: onCollect,
        fly,
        haptic: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        },
        announce: () =>
          AccessibilityInfo.announceForAccessibility(t('home.card.settled.collected')),
        exit,
        dismiss: onLeave,
      },
      reduceMotion,
    );
  };

  return { sticker, style, collect, collecting };
}
