import { useCallback, useEffect, useRef } from 'react';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const NEVER = ReduceMotion.Never;
const FROM_SCALE = 0.18;
const OUT_SCALE = 0.6;
const GROW = { duration: 380, dampingRatio: 0.75, reduceMotion: NEVER };
const APPEAR = { duration: 120, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: NEVER };
const LEAVE = { duration: 160, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: NEVER };
const FLIP = { duration: 500, easing: Easing.bezier(0.77, 0, 0.175, 1), reduceMotion: NEVER };
const FADE = { duration: 150, easing: Easing.bezier(0.23, 1, 0.32, 1), reduceMotion: NEVER };
const PERSPECTIVE = 1200;

export function usePinCardMotion({
  ready,
  closing,
  flipped,
  onGone,
}: {
  ready: boolean;
  closing: boolean;
  flipped: boolean;
  onGone: () => void;
}) {
  const reduced = useReducedMotion();
  const goneRef = useRef(onGone);
  useEffect(() => {
    goneRef.current = onGone;
  });
  const finish = useCallback(() => goneRef.current(), []);
  const grow = useSharedValue(0);
  const shown = useSharedValue(0);
  const turn = useSharedValue(0);

  useEffect(() => {
    if (!ready) {
      if (closing) finish();
      return;
    }
    const gone = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(finish);
    };
    if (closing) {
      shown.set(withTiming(0, reduced ? FADE : LEAVE, gone));
      if (!reduced) grow.set(withTiming(OUT_SCALE, LEAVE));
      return;
    }
    shown.set(withTiming(1, reduced ? FADE : APPEAR));
    grow.set(reduced ? 1 : withSpring(1, GROW));
  }, [ready, closing, reduced, grow, shown, finish]);

  useEffect(() => {
    turn.set(withTiming(flipped ? 1 : 0, reduced ? FADE : FLIP));
  }, [flipped, reduced, turn]);

  const card = useAnimatedStyle(() => {
    const progress = grow.get();
    return {
      opacity: shown.get(),
      transform: [{ scale: reduced ? 1 : FROM_SCALE + (1 - FROM_SCALE) * progress }],
    };
  });

  const front = useAnimatedStyle(() =>
    reduced
      ? { opacity: 1 - turn.get() }
      : { transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.get() * 180}deg` }] },
  );

  const back = useAnimatedStyle(() =>
    reduced
      ? { opacity: turn.get() }
      : { transform: [{ perspective: PERSPECTIVE }, { rotateY: `${turn.get() * 180 - 180}deg` }] },
  );

  return { card, front, back };
}
