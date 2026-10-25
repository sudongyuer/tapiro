import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { useLiveCardPaint, type LiveCardTone } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { MUTED_TEXT_OPACITY, vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { OwedCard, ProgressCard } from './cards/BountyCard';
import { CalmCard, FallbackCard } from './cards/CalmCard';
import { PayCard } from './cards/PayCard';
import { RideCard } from './cards/RideCard';
import type { LiveCardModel } from './homeModel';
import { PEEK, type CardPlacement, type StackLayout } from './stackLayout';

const MAX_Z = 10;

const TONE: Record<LiveCardModel['kind'], LiveCardTone> = {
  oweMoney: 'pay',
  rideSoon: 'ride',
  owedToYou: 'progress',
  bountyInProgress: 'progress',
  calm: 'calm',
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
  name,
  onAsk,
  onToggle,
  onCardLayout,
}: StackedCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const behind = index > 0 && !open;
  const hidden = !stacked.visible && !open;
  const motion = useAnimatedStyle(() => ({
    opacity: stacked.visible ? 1 : progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [stacked.y, fanned.y]) },
      { scale: interpolate(progress.value, [0, 1], [stacked.scale, fanned.scale]) },
    ],
  }));
  const face = useAnimatedStyle(() => ({ opacity: index > 0 ? 1 - progress.value : 0 }));
  const peek = card.kind === 'calm' ? '' : card.item.title;
  const paymentId = card.kind === 'calm' ? undefined : card.item.payment?.id;
  const openPayment = () => paymentId && router.push(`/pay/${paymentId}`);

  return (
    <Animated.View
      onLayout={onCardLayout(card.id)}
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
          <CardBody card={card} name={name} onAsk={onAsk} />
          <BackFace tone={TONE[card.kind]} label={peek} style={face} />
        </PressDim>
      ) : (
        <View
          accessible={card.kind !== 'calm'}
          accessibilityRole={paymentId ? 'button' : undefined}
          onAccessibilityTap={paymentId ? openPayment : undefined}
          testID={card.kind === 'calm' ? undefined : `live-card-${card.kind}`}
        >
          {paymentId ? (
            <PressDim onPress={openPayment}>
              <CardBody card={card} name={name} onAsk={onAsk} />
            </PressDim>
          ) : (
            <CardBody card={card} name={name} onAsk={onAsk} />
          )}
          {index > 0 ? <BackFace tone={TONE[card.kind]} label={peek} style={face} /> : null}
        </View>
      )}
    </Animated.View>
  );
}

function CardBody({ card, name, onAsk }: { card: LiveCardModel; name: string; onAsk: () => void }) {
  if (card.kind === 'calm') return <CalmCard name={name} onAsk={onAsk} />;
  const { detail, item } = card;
  switch (detail?.kind) {
    case 'oweMoney':
      return <PayCard detail={detail} />;
    case 'rideSoon':
      return <RideCard detail={detail} />;
    case 'owedToYou':
      return <OwedCard detail={detail} />;
    case 'bountyInProgress':
      return <ProgressCard detail={detail} />;
    default:
      return <FallbackCard item={item} />;
  }
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
