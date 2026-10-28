import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from './AppText';
import {
  HOLD_PRESS_IMPACT,
  holdCrossing,
  holdFillMs,
  holdRunBackMs,
  type HoldImpact,
} from './holdSchedule';
import { vars } from './theme/tokens';
import { useTheme } from './theme/useTheme';

export type HoldButtonState = 'disabled' | 'ready' | 'busy';

export type HoldButtonProps = {
  label: string;
  holdingLabel: string;
  busyLabel: string;
  hint?: string;
  accessibilityHint?: string;
  state: HoldButtonState;
  onComplete: () => void;
  onAccessibilityActivate: () => void;
  testID?: string;
};

const HEIGHT = 64;
const ACTIONS = [{ name: 'activate' as const }];
const IMPACTS: Record<HoldImpact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

function impact(kind: HoldImpact) {
  Haptics.impactAsync(IMPACTS[kind]).catch(() => undefined);
}

export function HoldButton({
  label,
  holdingLabel,
  busyLabel,
  hint,
  accessibilityHint,
  state,
  onComplete,
  onAccessibilityActivate,
  testID,
}: HoldButtonProps) {
  const { color } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(state === 'busy' ? 1 : 0);
  const holdingOnUI = useSharedValue(false);
  const pressing = useRef(false);
  const [holding, setHolding] = useState(false);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => completeRef.current(), []);

  const runBack = useCallback(() => {
    progress.set(
      withTiming(0, {
        duration: holdRunBackMs(reduceMotion),
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [progress, reduceMotion]);

  const release = useCallback(() => {
    pressing.current = false;
    holdingOnUI.set(false);
    setHolding(false);
  }, [holdingOnUI]);

  useEffect(() => {
    if (state === 'busy') {
      progress.set(1);
      return;
    }
    if (state === 'disabled' && pressing.current) release();
    if (!pressing.current) runBack();
  }, [state, progress, release, runBack]);

  useAnimatedReaction(
    () => progress.get(),
    (next, previous) => {
      if (previous === null || !holdingOnUI.get()) return;
      const crossing = holdCrossing(previous, next);
      for (const kind of crossing.impacts) scheduleOnRN(impact, kind);
      if (crossing.complete) scheduleOnRN(complete);
    },
    [complete],
  );

  const pressIn = () => {
    if (state !== 'ready') return;
    pressing.current = true;
    holdingOnUI.set(true);
    setHolding(true);
    impact(HOLD_PRESS_IMPACT);
    // The fill is progress, not decoration: it keeps its pace under Reduce Motion.
    progress.set(
      withTiming(1, {
        duration: holdFillMs(progress.get()),
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
    );
  };

  const pressOut = () => {
    if (!pressing.current) return;
    release();
    if (state !== 'busy') runBack();
  };

  const activate = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate' && state === 'ready') {
      onAccessibilityActivate();
    }
  };

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  const onFillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.45, 0.55], [0, 1], Extrapolation.CLAMP),
  }));
  const onTrackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.45, 0.55], [1, 0], Extrapolation.CLAMP),
  }));

  const busy = state === 'busy';
  const text = busy ? busyLabel : holding ? holdingLabel : label;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: state === 'disabled', busy }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={activate}
        onPressIn={pressIn}
        onPressOut={pressOut}
        testID={testID}
        style={[
          styles.track,
          { backgroundColor: color('--color-hold-track') },
          state === 'disabled' && styles.disabled,
        ]}
      >
        <Animated.View
          style={[styles.fill, { backgroundColor: color('--color-hold-fill') }, fillStyle]}
        />
        <Animated.View style={[styles.layer, onTrackStyle]}>
          <AppText variant="body" style={[styles.label, { color: color('--color-on-hold-track') }]}>
            {text}
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.layer, styles.overlay, onFillStyle]}>
          {busy ? <ActivityIndicator color={color('--color-on-hold-fill')} /> : null}
          <AppText variant="body" style={[styles.label, { color: color('--color-on-hold-fill') }]}>
            {text}
          </AppText>
        </Animated.View>
      </Pressable>
      {hint ? (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          style={styles.hint}
          testID={testID ? `${testID}-hint` : undefined}
        >
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: vars['--space-2'] },
  track: {
    minHeight: HEIGHT,
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { ...StyleSheet.absoluteFill, transformOrigin: 'left' },
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-2'],
    paddingHorizontal: vars['--space-5'],
    paddingVertical: vars['--space-3'],
  },
  overlay: StyleSheet.absoluteFill,
  label: { fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  hint: { textAlign: 'center' },
});
