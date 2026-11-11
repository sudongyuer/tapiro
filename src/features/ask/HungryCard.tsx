import { Image } from 'expo-image';
import { useState } from 'react';
import {
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { hungryOffer, type Belly, type HungryOffer } from './belly';
import { leafAt } from './feedMotion';
import type { PantryState } from './pantryStore';
import type { FeedMotion } from './useFeedMotion';

const MASCOT = 64;
const LEAF = 32;
const LEAF_IMAGE = require('@/assets/pantry/leaf.png');

export type HungryActions = {
  onFeed: () => void;
  onSwap: () => void;
  onTomorrow: () => void;
  onManual: () => void;
};

const center = (box: LayoutRectangle) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

function Leaf({
  motion,
  from,
  to,
}: {
  motion: FeedMotion;
  from: LayoutRectangle;
  to: LayoutRectangle;
}) {
  const start = center(from);
  const mouth = { x: to.x + to.width / 2, y: to.y + to.height * 0.72 };
  const style = useAnimatedStyle(() => {
    const at = leafAt(motion.progress.get(), start, mouth);
    return {
      opacity: at.opacity,
      transform: [
        { translateX: at.x - LEAF / 2 },
        { translateY: at.y - LEAF / 2 },
        { scale: at.scale },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.leaf, style]} testID="ask-hungry-leaf">
      <Image source={LEAF_IMAGE} style={styles.leafImage} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

function offerLabel(offer: HungryOffer, belly: Belly, t: ReturnType<typeof useI18n>['t']) {
  if (offer === 'feed') return t('ask.hungry.feed', { count: belly.leaves });
  if (offer === 'swap') return t('ask.hungry.swap');
  return offer === 'tomorrow' ? t('ask.hungry.tomorrow') : null;
}

export function HungryCard({
  belly,
  pantry,
  motion,
  actions,
}: {
  belly: Belly | null;
  pantry: PantryState;
  motion: FeedMotion;
  actions: HungryActions;
}) {
  const { t } = useI18n();
  const [mascot, setMascot] = useState<LayoutRectangle | null>(null);
  const [button, setButton] = useState<LayoutRectangle | null>(null);
  const offer = belly ? hungryOffer(belly) : null;
  const label = belly && offer ? offerLabel(offer, belly, t) : null;
  const writing = pantry.writing === 'feed' || pantry.writing === 'swapFeed';
  const onOffer =
    offer === 'feed' ? actions.onFeed : offer === 'swap' ? actions.onSwap : actions.onTomorrow;
  const measure = (set: (box: LayoutRectangle) => void) => (event: LayoutChangeEvent) =>
    set(event.nativeEvent.layout);

  return (
    <View
      style={[styles.card, { backgroundColor: PlatformColor('secondarySystemBackground') }]}
      testID={`ask-hungry-${offer ?? 'unknown'}`}
    >
      <View onLayout={measure(setMascot)}>
        <Mascot variant="front" size={MASCOT} />
      </View>
      <AppText variant="title" style={styles.center} accessibilityRole="header">
        {t('ask.hungry.title')}
      </AppText>
      <AppText
        variant="secondary"
        tone="secondaryLabel"
        style={styles.center}
        testID="ask-hungry-line"
      >
        {offer === 'capped' ? t('ask.hungry.capped') : t('ask.hungry.refill')}
      </AppText>
      {label ? (
        <View style={styles.action} onLayout={measure(setButton)}>
          <PillButton
            label={label}
            onPress={onOffer}
            loading={writing}
            loadingLabel={t('ask.hungry.feeding')}
            disabled={pantry.writing !== null || motion.flying}
            testID="ask-hungry-offer"
          />
        </View>
      ) : null}
      <View style={styles.action}>
        <PillButton
          label={t('ask.sheet.manual')}
          variant="secondary"
          onPress={actions.onManual}
          disabled={motion.flying}
          testID="ask-manual"
        />
      </View>
      {pantry.failure && pantry.failure.write !== 'swap' ? (
        <AppText variant="secondary" style={styles.center} testID="ask-hungry-failure">
          {t(`ask.pantryFailure.${pantry.failure.reason}`)}
        </AppText>
      ) : null}
      {motion.flying && mascot && button ? (
        <Leaf motion={motion} from={button} to={mascot} />
      ) : null}
      {motion.flying ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ask.hungry.skip')}
          onPress={motion.skip}
          style={StyleSheet.absoluteFill}
          testID="ask-hungry-skip"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: vars['--space-3'],
    padding: vars['--space-5'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
  },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch' },
  leaf: { position: 'absolute', left: 0, top: 0, width: LEAF, height: LEAF },
  leafImage: { width: LEAF, height: LEAF },
});
