import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { useLiveCardPaint, type LiveCardTone } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
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
  const { t } = useI18n();
  const { color } = useTheme();
  const { cards, layout, ready, open, onToggle } = props;
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
      {cards.length > 1 ? (
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={
            open ? t('home.stack.collapse') : t('home.stack.fanOut', { count: cards.length })
          }
          accessibilityHint={open ? t('home.stack.collapseHint') : t('home.stack.fanOutHint')}
          testID="live-cards-toggle"
          onPress={() => onToggle(!open)}
          style={styles.toggle}
        >
          <View style={[styles.togglePill, { backgroundColor: color('--color-stage-bubble') }]}>
            <AppText
              variant="meta"
              style={[styles.toggleText, { color: color('--color-on-stage') }]}
            >
              {open ? t('home.stack.collapse') : t('home.stack.fanOut', { count: cards.length })}
            </AppText>
          </View>
        </PressDim>
      ) : null}
    </View>
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
          testID={card.kind === 'calm' ? undefined : `live-card-${card.kind}`}
        >
          <CardBody card={card} name={name} onAsk={onAsk} />
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
    opacity: 0.7,
    paddingHorizontal: vars['--space-5'],
  },
  toggle: {
    position: 'absolute',
    zIndex: MAX_Z + 1,
    right: 0,
    top: -vars['--touch-min'] - vars['--space-1'],
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
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
