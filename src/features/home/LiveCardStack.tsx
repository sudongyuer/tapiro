import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import type { LiveCardTone } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';

import { BackFace } from './BackFace';
import { CardBody } from './cards/CardBody';
import { bountyDetail, type LiveCardModel } from './homeModel';
import { useLeavingCard } from './leavingCard';
import { backOffset, PEEK, SCALE_STEP, type CardPlacement, type StackLayout } from './stackLayout';
import { RESTACK } from './useStackFollow';

const MAX_Z = 10;
const LEAVE = { duration: 320, easing: Easing.bezier(0.4, 0, 0.2, 1) };
const LEAVE_RISE = 24;
const LEAVE_SHRINK = 0.08;
const FRONT: CardPlacement = { y: 0, scale: 1, visible: true };

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
    heightOf: (id: string) => measured[id] ?? 0,
    ready: heights.every((height) => height > 0),
    onCardLayout: (id: string) => (event: LayoutChangeEvent) => {
      const height = Math.round(event.nativeEvent.layout.height);
      setMeasured((current) => (current[id] === height ? current : { ...current, [id]: height }));
    },
  };
}

export type HomeChat = { open: (bountyId: string) => void; opening: string | null };

export type LiveCardStackProps = {
  cards: readonly LiveCardModel[];
  heights: readonly number[];
  heightOf: (id: string) => number;
  layout: StackLayout;
  ready: boolean;
  open: boolean;
  progress: SharedValue<number>;
  name: string;
  onAsk: (() => void) | null;
  onToggle: (open: boolean) => void;
  onCardLayout: (id: string) => (event: LayoutChangeEvent) => void;
  chat?: HomeChat;
};

export function LiveCardStack(props: LiveCardStackProps) {
  const { cards, heights, layout, ready } = props;
  const reduceMotion = useReducedMotion() || uiVerifyReduceMotion;
  const { leaving, rising, left } = useLeavingCard(cards, !reduceMotion);
  const [shown, setShown] = useState(ready);
  if (ready && !shown) setShown(true);
  return (
    <View style={[styles.cards, { opacity: shown ? 1 : 0 }]}>
      {[...cards, ...(leaving ? [leaving] : [])].map((card, index) =>
        card === leaving ? (
          <StackedCard
            key={card.id}
            {...props}
            card={card}
            index={0}
            stacked={FRONT}
            fanned={FRONT}
            measured
            onLeft={left}
          />
        ) : (
          <StackedCard
            key={card.id}
            {...props}
            card={card}
            index={index}
            stacked={layout.stacked[index]}
            fanned={layout.fanned[index]}
            measured={heights[index] > 0}
            rising={card.id === rising}
            riseFrom={
              card.id === rising && leaving
                ? backOffset(props.heightOf(leaving.id), heights[index])
                : PEEK
            }
          />
        ),
      )}
    </View>
  );
}

type StackedCardProps = LiveCardStackProps & {
  card: LiveCardModel;
  index: number;
  stacked: CardPlacement;
  fanned: CardPlacement;
  measured: boolean;
  rising?: boolean;
  riseFrom?: number;
  onLeft?: (id: string) => void;
};

function StackedCard({
  card,
  index,
  stacked,
  fanned,
  measured,
  rising,
  riseFrom = PEEK,
  onLeft,
  open,
  progress,
  ready,
  name,
  onAsk,
  onToggle,
  onCardLayout,
  chat,
}: StackedCardProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const bounty = bountyDetail(card);
  const behind = index > 0 && !open;
  const hidden = !stacked.visible && !open;
  const y = useSharedValue(rising ? stacked.y + PEEK : stacked.y);
  const scale = useSharedValue(rising ? stacked.scale - SCALE_STEP : stacked.scale);
  const faceShown = useSharedValue(index > 0 ? 1 : 0);
  const leave = useSharedValue(0);
  const leaving = onLeft !== undefined;
  const wasReady = useRef(ready);
  useEffect(() => {
    if (leaving || !ready) return;
    const animate = wasReady.current || rising === true;
    if (rising && !wasReady.current) {
      y.set(stacked.y + riseFrom);
      scale.set(stacked.scale - SCALE_STEP);
    }
    wasReady.current = true;
    y.set(animate ? withTiming(stacked.y, RESTACK) : stacked.y);
    scale.set(animate ? withTiming(stacked.scale, RESTACK) : stacked.scale);
    const face = index > 0 ? 1 : 0;
    faceShown.set(animate ? withTiming(face, RESTACK) : face);
  }, [leaving, rising, riseFrom, ready, index, stacked.y, stacked.scale, y, scale, faceShown]);
  useEffect(() => {
    if (!onLeft) return;
    const id = card.id;
    leave.set(
      withTiming(1, LEAVE, (finished) => {
        if (finished) scheduleOnRN(onLeft, id);
      }),
    );
  }, [onLeft, card.id, leave]);
  const motion = useAnimatedStyle(() => {
    const gone = leave.get();
    return {
      opacity: (measured ? 1 : 0) * (stacked.visible ? 1 : progress.value) * (1 - gone),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [y.get(), fanned.y]) - LEAVE_RISE * gone,
        },
        {
          scale:
            interpolate(progress.value, [0, 1], [scale.get(), fanned.scale]) *
            (1 - LEAVE_SHRINK * gone),
        },
      ],
    };
  });
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
  const message =
    bounty?.chat && chat && !behind
      ? {
          onPress: () => chat.open(bounty.bountyId),
          busy: chat.opening === bounty.bountyId,
        }
      : null;
  const actionsForVoiceOver = openTarget
    ? [
        { name: 'activate' },
        ...(message ? [{ name: 'message', label: t('home.card.bounty.message') }] : []),
      ]
    : undefined;
  const ownButton = card.kind === 'oweMoney';
  const grouped = card.kind !== 'calm' && card.kind !== 'unavailable' && card.kind !== 'settled';

  return (
    <Animated.View
      onLayout={onCardLayout(card.id)}
      pointerEvents={leaving ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden || leaving}
      importantForAccessibility={hidden || leaving ? 'no-hide-descendants' : 'auto'}
      style={[styles.card, { zIndex: leaving ? MAX_Z + 1 : MAX_Z - index }, motion]}
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
          accessibilityActions={actionsForVoiceOver}
          onAccessibilityAction={(event) =>
            event.nativeEvent.actionName === 'message' ? message?.onPress() : openTarget?.()
          }
          testID={grouped ? `live-card-${card.kind}` : undefined}
        >
          {openTarget && !ownButton ? (
            <PressDim onPress={openTarget}>
              <CardBody card={card} behind={behind} name={name} onAsk={onAsk} message={message} />
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

const styles = StyleSheet.create({
  cards: { flex: 1 },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    transformOrigin: 'bottom',
  },
});
