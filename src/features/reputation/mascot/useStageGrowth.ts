import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import type { StageActor } from '@/ui/MascotStage';

import { useMyMascot } from '../hooks';
import { easeEnter, progress } from '../review/sealTimeline';
import { growMarks, meStore } from '../services';
import {
  GROW,
  GROW_BUBBLE_RISE,
  GROW_CROUCH,
  GROW_REDUCED,
  GROW_SPRING,
  GROW_WEAR_FROM,
  growScale,
  growStep,
} from './growTimeline';

export function useStageGrowth({
  userId,
  visible,
  open,
}: {
  userId: string;
  visible: boolean;
  open: () => void;
}): StageActor {
  const { t } = useI18n();
  const mascot = useMyMascot();
  const data = mascot.status === 'idle' ? null : mascot.data;
  const level = data?.level ?? 1;
  const levelUp = data?.levelUp ?? false;
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const total = reduced ? GROW_REDUCED.total : GROW.total;

  const [marked] = useState(() => growMarks.played(userId));
  const played = useRef(marked);
  const clock = useSharedValue<number>(total);
  const grown = useSharedValue(1);
  const opened = useRef(false);

  const finish = useCallback(() => {
    cancelAnimation(clock);
    clock.set(total);
    cancelAnimation(grown);
    grown.set(1);
  }, [clock, grown, total]);

  useEffect(() => {
    if (visible) opened.current = false;
    const step = growStep({ levelUp, level, played: played.current, visible });
    if (step === 'finish') finish();
    if (step !== 'hold' && step !== 'play') return;
    clock.set(0);
    grown.set(0);
    if (step === 'hold') return;
    growMarks.mark(userId, level);
    played.current = level;
    clock.set(
      withTiming(total, {
        duration: total,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [levelUp, level, visible, userId, total, clock, grown, finish]);

  useAnimatedReaction(
    () => !reduced && clock.value >= GROW.crouch.end,
    (now, before) => {
      if (now && before === false) grown.set(withSpring(1, GROW_SPRING));
    },
  );

  const press = useCallback(() => {
    if (opened.current || meStore.markingLevel()) return;
    opened.current = true;
    finish();
    open();
  }, [open, finish]);

  const bodyStyle = useAnimatedStyle(() => {
    if (reduced) return {};
    const crouched = easeEnter(progress(clock.value, GROW.crouch));
    return {
      transform: [
        { scaleX: growScale(crouched, grown.value, GROW_CROUCH.x) },
        { scaleY: growScale(crouched, grown.value, GROW_CROUCH.y) },
      ],
    };
  });

  const wearStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress(clock.value, GROW_REDUCED.wear) };
    const shown = progress(clock.value, GROW.wear);
    return {
      opacity: shown,
      transform: [{ scale: GROW_WEAR_FROM + (1 - GROW_WEAR_FROM) * shown }],
    };
  });

  const revealStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress(clock.value, GROW_REDUCED.bubble) };
    const shown = progress(clock.value, GROW.bubble);
    return {
      opacity: shown,
      transform: [{ translateY: GROW_BUBBLE_RISE * (1 - easeEnter(shown)) }],
    };
  });

  return {
    wear: data?.accessory ?? null,
    say: levelUp ? t('reputation.level.grewUp') : null,
    hint: levelUp ? 'star' : null,
    onPress: levelUp ? press : null,
    action: levelUp ? t('reputation.grown.action') : null,
    bodyStyle,
    wearStyle,
    revealStyle,
  };
}
