import { useEffect } from 'react';
import { PlatformColor, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { AppText } from '@/ui/AppText';
import { Mascot } from '@/ui/Mascot';
import { MomentBackground } from '@/ui/MomentBackground';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { grownLines, type GrownMoment } from './grownView';

const HERO = 170;
const ROW_ART = 32;
const ENTER_FROM = 0.72;
const ENTER_PEAK = 1.08;
const ENTER_UP = 540;
const ENTER_DOWN = 360;
const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

function useEntrance() {
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  const scale = useSharedValue(reduced ? 1 : ENTER_FROM);
  const opacity = useSharedValue(reduced ? 0 : 1);
  useEffect(() => {
    if (reduced) {
      opacity.set(
        withTiming(1, { duration: vars['--duration-fade'], reduceMotion: ReduceMotion.Never }),
      );
      return;
    }
    scale.set(
      withSequence(
        withTiming(ENTER_PEAK, { duration: ENTER_UP, easing: easeOut }),
        withTiming(1, { duration: ENTER_DOWN, easing: easeOut }),
      ),
    );
  }, [reduced, scale, opacity]);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
}

export function MascotGrownScreen({
  moment,
  onGo,
}: {
  moment: GrownMoment;
  onGo: (() => void) | null;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const lines = grownLines(moment, t);
  const entrance = useEntrance();
  return (
    <MomentBackground testID="mascot-grown">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <AppText variant="secondary" tone="secondaryLabel" testID="mascot-grown-progress">
          {lines.progress}
        </AppText>
        <Animated.View style={[styles.hero, entrance]} accessibilityElementsHidden>
          <Mascot variant="side" size={HERO} outlined wear={moment.wear} />
        </Animated.View>
        <AppText
          variant="moment-title"
          accessibilityRole="header"
          style={styles.center}
          testID="mascot-grown-title"
        >
          {lines.title}
        </AppText>
        <AppText
          variant="body"
          tone="secondaryLabel"
          style={styles.center}
          testID="mascot-grown-body"
        >
          {t('reputation.grown.body')}
        </AppText>
        {lines.unlocked.length > 0 ? (
          <View style={styles.card} testID="mascot-grown-unlocked">
            <AppText variant="title">{t('reputation.grown.unlockedTitle')}</AppText>
            {lines.unlocked.map(({ accessory, line }) => (
              <View key={accessory} style={styles.row} accessible accessibilityLabel={line}>
                <Mascot variant="side" size={ROW_ART} wear={accessory} darkOutline />
                <AppText variant="body" style={styles.rowText}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        <View style={[styles.note, { backgroundColor: color('--color-moment-chip') }]}>
          <AppText variant="secondary" tone="secondaryLabel" testID="mascot-grown-note">
            {t('reputation.grown.note')}
          </AppText>
        </View>
        {onGo ? (
          <View style={styles.action}>
            <PillButton label={t('reputation.grown.go')} onPress={onGo} testID="mascot-grown-go" />
          </View>
        ) : null}
      </ScrollView>
    </MomentBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: vars['--space-4'],
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-3'],
    paddingBottom: vars['--space-5'],
  },
  hero: { marginTop: vars['--space-5'], marginBottom: vars['--space-3'] },
  center: { textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    gap: vars['--space-3'],
    padding: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  rowText: { flex: 1 },
  note: {
    alignSelf: 'stretch',
    padding: vars['--space-3'],
    borderRadius: vars['--space-3'],
    borderCurve: 'continuous',
  },
  action: { alignSelf: 'stretch', marginTop: vars['--space-3'] },
});
