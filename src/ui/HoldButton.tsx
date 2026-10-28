import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { AppText } from './AppText';
import {
  HOLD_IDLE,
  HOLD_PRESS_IMPACT,
  holdFillMs,
  holdFrame,
  holdPress,
  holdRelease,
  holdRunBackMs,
  type HoldImpact,
  type HoldTrack,
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
const NEVER = ReduceMotion.Never;
const RUN_BACK_EASING = Easing.out(Easing.cubic);
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
  const width = useSharedValue(0);
  const track = useSharedValue<HoldTrack>(HOLD_IDLE);
  const pressing = useRef(false);
  const mounted = useRef(true);
  const [holding, setHolding] = useState(false);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const complete = useCallback(() => {
    if (mounted.current) completeRef.current();
  }, []);

  const release = useCallback(
    (runBack: boolean) => {
      pressing.current = false;
      setHolding(false);
      const backMs = holdRunBackMs(reduceMotion);
      scheduleOnUI(() => {
        'worklet';
        track.set(holdRelease(track.get()));
        if (runBack) {
          progress.set(
            withTiming(0, {
              duration: backMs,
              easing: RUN_BACK_EASING,
              reduceMotion: NEVER,
            }),
          );
        }
      });
    },
    [progress, reduceMotion, track],
  );

  useEffect(() => {
    if (state === 'busy') {
      scheduleOnUI(() => {
        'worklet';
        track.set(holdRelease(track.get()));
        progress.set(1);
      });
      return;
    }
    if (!pressing.current || state === 'disabled') release(true);
  }, [state, progress, track, release]);

  useAnimatedReaction(
    () => progress.get(),
    (next) => {
      const framed = holdFrame(track.get(), next);
      track.set(framed.track);
      for (const kind of framed.impacts) scheduleOnRN(impact, kind);
      if (framed.complete) scheduleOnRN(complete);
    },
    [complete],
  );

  const pressIn = () => {
    if (state !== 'ready') return;
    pressing.current = true;
    setHolding(true);
    impact(HOLD_PRESS_IMPACT);
    scheduleOnUI(() => {
      'worklet';
      const pressed = holdPress(track.get());
      track.set(pressed.track);
      // The fill is progress, not decoration: it keeps its pace under Reduce Motion.
      progress.set(
        withSequence(
          withTiming(pressed.from, { duration: 0, reduceMotion: NEVER }),
          withTiming(1, {
            duration: holdFillMs(pressed.from),
            easing: Easing.linear,
            reduceMotion: NEVER,
          }),
        ),
      );
    });
  };

  const pressOut = () => {
    if (pressing.current) release(state !== 'busy');
  };

  const activate = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate' && state === 'ready') {
      onAccessibilityActivate();
    }
  };

  const measure = (event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: width.get() > 0 ? 1 : 0,
    transform: [{ translateX: (progress.get() - 1) * width.get() }],
  }));
  const fillContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.get()) * width.get() }],
  }));

  const busy = state === 'busy';
  const text = busy ? busyLabel : holding ? holdingLabel : label;

  const content = (tone: '--color-on-hold-track' | '--color-on-hold-fill') => (
    <>
      {busy ? <ActivityIndicator color={color(tone)} /> : null}
      <AppText
        variant="body"
        numberOfLines={2}
        ellipsizeMode="middle"
        style={[styles.label, { color: color(tone) }]}
      >
        {text}
      </AppText>
    </>
  );

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? busyLabel : label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: state === 'disabled', busy }}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={activate}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onLayout={measure}
        testID={testID}
        style={[
          styles.track,
          { backgroundColor: color('--color-hold-track') },
          state === 'disabled' && styles.disabled,
        ]}
      >
        <View style={styles.layer}>{content('--color-on-hold-track')}</View>
        <Animated.View
          style={[styles.clip, { backgroundColor: color('--color-hold-fill') }, fillStyle]}
        >
          <Animated.View style={[styles.layer, styles.clip, fillContentStyle]}>
            {content('--color-on-hold-fill')}
          </Animated.View>
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
  clip: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vars['--space-2'],
    paddingHorizontal: vars['--space-5'],
    paddingVertical: vars['--space-3'],
  },
  label: { fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.4 },
  hint: { textAlign: 'center' },
});
