import * as Haptics from 'expo-haptics';
import {
  createElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import type { StageActor } from '@/ui/MascotStage';
import { vars } from '@/ui/theme/tokens';

import { useWeeklyFeed } from '../hooks';
import { coinsStore } from '../services';
import { FeedLeaf } from './FeedLeaf';
import { createFeedGate, FEED_LINES, feedAnswered, feedStep } from './feedStep';
import {
  ANSWER_HOLD_MS,
  BITE,
  easeMove,
  enterCurve,
  FEED_BUBBLE,
  LEAF,
  leafDrop,
} from './feedTimeline';

const NEVER = { reduceMotion: ReduceMotion.Never } as const;
const FADE = { duration: vars['--duration-fade'], ...NEVER };

function subscribeAppState(listener: () => void) {
  const subscription = AppState.addEventListener('change', listener);
  return () => subscription.remove();
}

const appActive = () => AppState.currentState === 'active';

function firstBite() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function useStageFeed({ visible }: { visible: boolean }): Partial<StageActor> {
  const { t } = useI18n();
  const { status, feed } = useWeeklyFeed();
  const reduced = useReducedMotion() || uiVerifyReduceMotion;

  const [tapped, setTapped] = useState(false);
  const [landed, setLanded] = useState(false);
  const [chewed, setChewed] = useState(false);
  const step = feedStep({ tapped, landed, chewed, feed });
  const [gate] = useState(createFeedGate);
  const active = useSyncExternalStore(subscribeAppState, appActive);
  const onScreen = visible && active;
  const seen = useRef(onScreen);

  const drop = useSharedValue(0);
  const shown = useSharedValue(0);
  const out = useSharedValue(0);
  const falls = useSharedValue(false);
  const bite = useSharedValue(0);
  const reveal = useSharedValue(1);

  const press = useCallback(() => {
    if (!gate.take()) return;
    setTapped(true);
    setLanded(false);
    setChewed(false);
    out.set(0);
    falls.set(false);
    reveal.set(0);
    const land = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(setLanded, true);
    };
    if (reduced) {
      drop.set(1);
      shown.set(0);
      shown.set(withTiming(1, FADE, land));
    } else {
      shown.set(1);
      drop.set(0);
      drop.set(withTiming(1, { duration: LEAF.drop, easing: Easing.linear }, land));
    }
    void coinsStore.feed();
  }, [drop, falls, gate, out, reduced, reveal, shown]);

  useEffect(() => {
    seen.current = onScreen;
  }, [onScreen]);

  useEffect(() => {
    const showBubble = () =>
      reveal.set(
        reduced
          ? withTiming(1, FADE)
          : withTiming(1, { duration: FEED_BUBBLE.duration, easing: enterCurve }),
      );
    if (step === 'waiting') showBubble();
    if (step === 'chewing') {
      if (seen.current) firstBite();
      reveal.set(0);
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(setChewed, true);
      };
      out.set(
        reduced
          ? withTiming(1, FADE, done)
          : withTiming(1, { duration: LEAF.eat, easing: enterCurve }),
      );
      if (!reduced) {
        const one = (value: number) => withTiming(value, { duration: BITE.step, easing: easeMove });
        bite.set(
          withSequence(
            one(1),
            one(0),
            one(1),
            withTiming(0, { duration: BITE.step, easing: easeMove }, done),
          ),
        );
      }
    }
    if (step === 'alreadyFed' || step === 'failed') {
      falls.set(true);
      out.set(
        reduced ? withTiming(1, FADE) : withTiming(1, { duration: LEAF.fall, easing: enterCurve }),
      );
    }
    if (feedAnswered(step)) showBubble();
  }, [step, reduced, reveal, out, bite, falls]);

  useEffect(() => {
    gate.update(step);
    if (feedAnswered(step)) {
      AccessibilityInfo.announceForAccessibility(t(FEED_LINES[step as keyof typeof FEED_LINES]));
    }
  }, [gate, step, t]);

  useEffect(() => {
    if (!feedAnswered(step) || !onScreen) return;
    const hold = setTimeout(() => {
      coinsStore.settleFeed();
      setTapped(false);
      setLanded(false);
      setChewed(false);
      reveal.set(1);
    }, ANSWER_HOLD_MS);
    return () => clearTimeout(hold);
  }, [step, onScreen, reveal]);

  const leafStyle = useAnimatedStyle(() => {
    const left = 1 - out.value;
    if (reduced) return { opacity: shown.value * left, transform: [] };
    const landing = leafDrop(drop.value);
    const gone = out.value;
    return falls.value
      ? {
          opacity: left,
          transform: [
            { translateX: LEAF.fallX * gone },
            { translateY: LEAF.fallY * gone },
            { rotate: `${LEAF.fallTurn * gone}deg` },
          ],
        }
      : {
          opacity: landing.opacity * left,
          transform: [
            { translateX: LEAF.eatX * gone },
            { translateY: landing.y + LEAF.eatY * gone },
            { rotate: `${landing.turn}deg` },
            { scale: 1 - (1 - LEAF.eatScale) * gone },
          ],
        };
  });

  const chewStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 1 + (BITE.scaleX - 1) * bite.value },
      { scaleY: 1 + (BITE.scaleY - 1) * bite.value },
    ],
  }));

  const hungry = status.status === 'ready' && status.data?.fedThisWeek === false;
  const say = (() => {
    if (step === 'idle') return hungry ? t('coins.feed.idle') : null;
    return step === 'dropping' || step === 'chewing' ? '' : t(FEED_LINES[step]);
  })();

  return {
    say,
    sayOverLive: step === 'waiting' || step === 'chewing' || feedAnswered(step),
    hint: step === 'idle' && hungry ? 'leaf' : null,
    onPress: press,
    action: t('coins.feed.action'),
    chewStyle,
    overlay: step === 'idle' ? null : createElement(FeedLeaf, { style: leafStyle }),
    reveal,
    revealRise: reduced ? 0 : FEED_BUBBLE.rise,
  };
}
