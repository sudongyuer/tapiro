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
import { scheduleOnRN } from 'react-native-worklets';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import type { StageActor } from '@/ui/MascotStage';

import { useMyMascot } from '../hooks';
import { easeEnter, progress } from '../review/sealTimeline';
import { growMarks } from '../services';
import {
  GROW,
  GROW_BUBBLE_RISE,
  GROW_CROUCH,
  GROW_FROM,
  GROW_REDUCED,
  GROW_SPRING,
  GROW_WEAR_FROM,
  growScale,
} from './growTimeline';

export type StageGrowth = { actor: StageActor; pending: boolean };

export function useStageGrowth({
  userId,
  visible,
  open,
}: {
  userId: string;
  visible: boolean;
  open: () => void;
}): StageGrowth {
  const { t } = useI18n();
  const mascot = useMyMascot();
  const data = mascot.status === 'idle' ? null : mascot.data;
  const level = data?.level ?? 1;
  const levelUp = data?.levelUp ?? false;
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const total = reduced ? GROW_REDUCED.total : GROW.total;

  const [played, setPlayed] = useState(() => growMarks.played(userId));
  const [running, setRunning] = useState(false);
  const due = levelUp && level > played;
  const clock = useSharedValue<number>(total);
  const grown = useSharedValue(1);
  const opened = useRef(false);

  useEffect(() => {
    if (!due) return;
    clock.set(0);
    grown.set(0);
    if (!visible) return;
    growMarks.mark(userId, level);
    setPlayed(level);
    setRunning(true);
  }, [due, visible, userId, level, clock, grown]);

  useEffect(() => {
    if (!running) return;
    clock.set(
      withTiming(
        total,
        { duration: total, easing: Easing.linear, reduceMotion: ReduceMotion.Never },
        (finished) => {
          if (finished) scheduleOnRN(setRunning, false);
        },
      ),
    );
  }, [running, total, clock]);

  useAnimatedReaction(
    () => !reduced && clock.value >= GROW.crouch.end,
    (now, before) => {
      if (now && before === false) grown.set(withSpring(1, GROW_SPRING));
    },
  );

  const skip = useCallback(() => {
    cancelAnimation(clock);
    clock.set(total);
    cancelAnimation(grown);
    grown.set(1);
    setRunning(false);
  }, [clock, grown, total]);

  useEffect(() => {
    if (running && !visible) skip();
    if (visible) opened.current = false;
  }, [running, visible, skip]);

  const press = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    skip();
    open();
  }, [open, skip]);

  const bodyStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress(clock.value, GROW_REDUCED.swap) };
    const crouched = easeEnter(progress(clock.value, GROW.crouch));
    return {
      transform: [
        { scaleX: growScale(crouched, grown.value, GROW_CROUCH.x) },
        { scaleY: growScale(crouched, grown.value, GROW_CROUCH.y) },
      ],
    };
  });

  const oldBodyStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress(clock.value, GROW_REDUCED.swap),
    transform: [{ scale: GROW_FROM }],
  }));

  const wearStyle = useAnimatedStyle(() => {
    if (reduced) return {};
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
    pending: levelUp,
    actor: {
      wear: data?.accessory ?? null,
      say: levelUp ? t('reputation.level.grewUp') : null,
      hint: levelUp ? 'star' : null,
      onPress: levelUp ? press : null,
      action: levelUp ? t('reputation.grown.action') : null,
      bodyStyle,
      oldBodyStyle: reduced && (due || running) ? oldBodyStyle : undefined,
      wearStyle,
      revealStyle,
    },
  };
}
