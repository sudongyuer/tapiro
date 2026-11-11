import { Alert, PlatformColor, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { BELLY_SEGMENTS, bellyMood, bellySegments, type Belly } from './belly';
import { segmentLevel } from './feedMotion';

const SEGMENT_WIDTH = 18;
const SEGMENT_HEIGHT = 10;
const SEGMENT_GAP = 3;
const ROW_HEIGHT = 28;
const ROW_SLOP = (vars['--touch-min'] - ROW_HEIGHT) / 2;

function Segment({
  index,
  lit,
  fill,
  progress,
}: {
  index: number;
  lit: boolean;
  fill: string;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const level = lit ? segmentLevel(progress.get(), index) : 0;
    return { opacity: level, transform: [{ scaleX: 0.4 + 0.6 * level }] };
  });
  return (
    <View style={[styles.segment, { backgroundColor: PlatformColor('systemFill') }]}>
      <Animated.View style={[styles.fill, { backgroundColor: fill }, style]} />
    </View>
  );
}

export function BellyBar({ belly, progress }: { belly: Belly; progress: SharedValue<number> }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const segments = bellySegments(belly);
  const mood = bellyMood(belly);
  const fill = color(segments === 1 ? '--color-belly-low' : '--color-belly');
  const moodText = t(`ask.belly.mood.${mood}`);
  const explain = () =>
    Alert.alert(t('ask.belly.aboutTitle'), t('ask.belly.about', { count: belly.leaves }), [
      { text: t('ask.belly.aboutOk') },
    ]);

  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={t('ask.belly.a11y', { count: segments, mood: moodText })}
      accessibilityHint={t('ask.belly.hint')}
      accessibilityValue={{ min: 0, max: BELLY_SEGMENTS, now: segments }}
      hitSlop={{ top: ROW_SLOP, bottom: ROW_SLOP }}
      onPress={explain}
      style={styles.row}
      testID="ask-belly"
    >
      <View style={styles.bar}>
        {Array.from({ length: BELLY_SEGMENTS }, (_, index) => (
          <Segment
            key={index}
            index={index}
            lit={index < segments}
            fill={fill}
            progress={progress}
          />
        ))}
      </View>
      <AppText variant="meta" tone="secondaryLabel" numberOfLines={1} testID="ask-belly-mood">
        {moodText}
      </AppText>
    </PressDim>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: vars['--space-2'],
    minHeight: ROW_HEIGHT,
  },
  bar: { flexDirection: 'row', gap: SEGMENT_GAP },
  segment: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    borderRadius: SEGMENT_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: { flex: 1, borderRadius: SEGMENT_HEIGHT / 2 },
});
