import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { useLiveCardPaint, type LiveCardTone } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { MUTED_TEXT_OPACITY, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { CardBody } from './cards/CardBody';
import { bountyDetail, type LiveCardModel } from './homeModel';
import { PEEK, type CardPlacement, type StackLayout } from './stackLayout';

const MAX_Z = 10;
const RESTACK = { duration: 420, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };
const LEAVE = { duration: 320, easing: Easing.bezier(0.4, 0, 0.2, 1) };

function leaveUp() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      opacity: withTiming(0, LEAVE),
      transform: [{ translateY: withTiming(-24, LEAVE) }, { scale: withTiming(0.92, LEAVE) }],
    },
  };
}

const TONE: Record<LiveCardModel['kind'], LiveCardTone> = {
  oweMoney: 'pay',
  rideSoon: 'ride',
  owedToYou: 'progress',
  bountyAction: 'progress',
  settled: 'progress',
  bountyInProgress: 'progress',
  waitingConfirm: 'calm',
  calm: 'calm',
  unavailable: 'calm',
};

export function useCardHeights(cards: readonly LiveCardModel[]) {
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const heights = cards.map((card) => measured[card.id] ?? 0);
  return {
    heights,
    ready: heights.every((height) => height > 0),
    onCardLayout: (id: string) => (event: LayoutChangeEvent) => {
      const height = Math.round(event.nativeEvent.layout.height);
      setMeasured((current) => (current[id] === height ? current : { ...current, [id]: height }));
    },
  };
}

export type LiveCardStackProps = {
  cards: readonly LiveCardModel[];
  layout: StackLayout;
  ready: boolean;
  open: boolean;
  progress: SharedValue<number>;
  name: string;
  onAsk: () => void;
  onToggle: (open: boolean) => void;
  onCardLayout: (id: string) => (event: LayoutChangeEvent) => void;
};

export function LiveCardStack(props: LiveCardStackProps) {
  const { cards, layout, ready } = props;
  return (
    <View style={[styles.cards, { opacity: ready ? 1 : 0 }]}>
      {cards.map((card, index) => (
        <StackedCard
          key={card.id}
          {...props}
          card={card}
          index={index}
          stacked={layout.stacked[index]}
          fanned={layout.fanned[index]}
        />
      ))}
    </View>
  );
}

export function StackToggle({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const label = open ? t('home.stack.collapse') : t('home.stack.fanOut', { count });
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={open ? t('home.stack.collapseHint') : t('home.stack.fanOutHint')}
      testID="live-cards-toggle"
      onPress={() => onToggle(!open)}
      style={styles.toggle}
    >
      <View style={[styles.togglePill, { backgroundColor: color('--color-stage-bubble') }]}>
        <AppText variant="meta" style={[styles.toggleText, { color: color('--color-on-stage') }]}>
          {label}
        </AppText>
      </View>
    </PressDim>
  );
}

type StackedCardProps = LiveCardStackProps & {
  card: LiveCardModel;
  index: number;
  stacked: CardPlacement;
  fanned: CardPlacement;
};

function StackedCard({
  card,
  index,
  stacked,
  fanned,
  open,
  progress,
  ready,
  name,
  onAsk,
  onToggle,
  onCardLayout,
}: StackedCardProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const bounty = bountyDetail(card);
  const behind = index > 0 && !open;
  const hidden = !stacked.visible && !open;
  const y = useSharedValue(stacked.y);
  const scale = useSharedValue(stacked.scale);
  const faceShown = useSharedValue(index > 0 ? 1 : 0);
  const wasReady = useRef(ready);
  useEffect(() => {
    const animate = wasReady.current && ready;
    wasReady.current = ready;
    y.set(animate ? withTiming(stacked.y, RESTACK) : stacked.y);
    scale.set(animate ? withTiming(stacked.scale, RESTACK) : stacked.scale);
    const face = index > 0 ? 1 : 0;
    faceShown.set(animate ? withTiming(face, RESTACK) : face);
  }, [ready, index, stacked.y, stacked.scale, y, scale, faceShown]);
  const motion = useAnimatedStyle(() => ({
    opacity: stacked.visible ? 1 : progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [y.get(), fanned.y]) },
      { scale: interpolate(progress.value, [0, 1], [scale.get(), fanned.scale]) },
    ],
  }));
  const face = useAnimatedStyle(() => ({ opacity: faceShown.get() * (1 - progress.value) }));
  const peek = bounty
    ? t('home.card.bounty.line', { title: bounty.title, line: bounty.line })
    : card.kind === 'calm'
      ? ''
      : card.kind === 'unavailable'
        ? t('home.card.unavailable.title')
        : card.item.title;
  const paymentId =
    card.kind === 'calm' || card.kind === 'unavailable' ? undefined : card.item.payment?.id;
  const openTarget = paymentId
    ? () => router.push(`/pay/${paymentId}`)
    : bounty
      ? () => router.push(bounty.target as Href, { withAnchor: true })
      : undefined;
  const label = bounty
    ? t('home.card.bounty.label', {
        title: bounty.title,
        line: bounty.line,
        reward: formatMoney(bounty.reward, language, { whole: true }),
      })
    : undefined;
  const ownButton = card.kind === 'oweMoney';
  const grouped = card.kind !== 'calm' && card.kind !== 'unavailable' && card.kind !== 'settled';

  return (
    <Animated.View
      onLayout={onCardLayout(card.id)}
      exiting={card.kind === 'settled' ? leaveUp : undefined}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      style={[styles.card, { zIndex: MAX_Z - index }, motion]}
    >
      {behind ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={peek}
          accessibilityHint={t('home.stack.peekHint')}
          testID={`live-card-peek-${index}`}
          onPress={() => onToggle(true)}
        >
          <CardBody card={card} behind={behind} name={name} onAsk={onAsk} />
          <BackFace tone={TONE[card.kind]} label={peek} style={face} />
        </PressDim>
      ) : (
        <View
          accessible={grouped}
          accessibilityRole={openTarget ? 'button' : undefined}
          accessibilityLabel={label}
          accessibilityActions={openTarget ? [{ name: 'activate' }] : undefined}
          onAccessibilityAction={openTarget}
          testID={grouped ? `live-card-${card.kind}` : undefined}
        >
          {openTarget && !ownButton ? (
            <PressDim onPress={openTarget}>
              <CardBody card={card} behind={behind} name={name} onAsk={onAsk} />
            </PressDim>
          ) : (
            <CardBody card={card} behind={behind} name={name} onAsk={onAsk} />
          )}
          <BackFace tone={TONE[card.kind]} label={peek} style={face} />
        </View>
      )}
    </Animated.View>
  );
}

function BackFace({
  tone,
  label,
  style,
}: {
  tone: LiveCardTone;
  label: string;
  style: ReturnType<typeof useAnimatedStyle>;
}) {
  const { surface, ink } = useLiveCardPaint(tone);
  return (
    <Animated.View pointerEvents="none" style={[styles.face, { backgroundColor: surface }, style]}>
      <AppText variant="meta" numberOfLines={1} style={[styles.faceLabel, { color: ink }]}>
        {label}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cards: { flex: 1 },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'bottom',
  },
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: vars['--radius-sheet'],
    borderCurve: 'continuous',
    justifyContent: 'flex-end',
  },
  faceLabel: {
    height: PEEK,
    lineHeight: PEEK,
    textAlign: 'center',
    fontWeight: '700',
    opacity: MUTED_TEXT_OPACITY,
    paddingHorizontal: vars['--space-5'],
  },
  toggle: {
    alignSelf: 'flex-end',
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    marginTop: vars['--space-2'],
  },
  togglePill: {
    opacity: 0.9,
    paddingHorizontal: vars['--space-3'],
    minHeight: vars['--space-7'] - vars['--space-1'],
    justifyContent: 'center',
    borderRadius: vars['--radius-pill'],
  },
  toggleText: { fontWeight: '700' },
});
