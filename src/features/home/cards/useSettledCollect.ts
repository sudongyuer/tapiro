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
import { useTheme } from '@/ui/theme/useTheme';

import { runSettledCollect, type SettledExit } from './settledCollect';

const ME_TAB_ID = 'tab-me';
const FADE = {
  duration: 200,
  easing: Easing.bezier(0, 0, 0.58, 1),
  reduceMotion: ReduceMotion.Never,
} as const;

export function useSettledCollect({
  onCollect,
  onLeave,
}: {
  onCollect: () => void;
  onLeave: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const reduceMotion = useReducedMotion() || uiVerifyReduceMotion;
  const sticker = useRef<View>(null);
  const card = useRef<View>(null);
  const started = useRef(false);
  const [collecting, setCollecting] = useState(false);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  // A landed card leaves through the stack's exiting animation, so the next card can rise while it goes.
  const exit = (kind: SettledExit) =>
    kind === 'leave'
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          opacity.set(
            withTiming(0, FADE, () => {
              scheduleOnRN(resolve);
            }),
          );
        });

  const fly = () => {
    const viewTag = findNodeHandle(sticker.current);
    if (viewTag === null) return Promise.resolve({ landed: false });
    return StickerFlight.flyToTab({
      viewTag,
      anchorTag: findNodeHandle(card.current) ?? undefined,
      tabId: ME_TAB_ID,
      reduceMotion,
      badge: t('home.card.settled.badge'),
      badgeColor: color('--color-paper-green'),
      badgeInk: color('--color-sticker-border'),
    });
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

  return { sticker, card, style, collect, collecting };
}
