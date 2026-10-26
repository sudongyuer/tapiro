import { PlatformColor, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { InkText } from '@/ui/InkText';
import { Odometer } from './Odometer';
import { Shine } from './Shine';
import { TIMELINE, tween } from './timeline';
import type { Clock } from './useCelebrationClock';

export function Headline({
  clock,
  top,
  amountSen,
  language,
  cny,
  title,
  body,
  announcement,
}: {
  clock: Clock;
  top: string;
  amountSen: number;
  language: string;
  cny: string | null;
  title: string;
  body: string;
  announcement: string;
}) {
  const { color } = useTheme();
  const rise = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.headline, 0, 1);
    return {
      opacity: p,
      transform: [{ translateY: 14 * (1 - p) }, { scale: 0.96 + 0.04 * p }],
    };
  });
  const titleIn = useAnimatedStyle(() => {
    const p = tween(clock.value, TIMELINE.title, 0, 1);
    return { opacity: p, transform: [{ translateY: 12 * (1 - p) }] };
  });
  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View
        style={[styles.group, rise]}
        accessible
        accessibilityLabel={cny ? `${announcement} ${cny}` : announcement}
        testID="pay-celebration-summary"
      >
        <AppText variant="meta" tone="secondaryLabel" style={styles.top}>
          {top}
        </AppText>
        <View style={styles.amount}>
          <Odometer amountSen={amountSen} language={language} clock={clock} />
          <Shine clock={clock} segment={TIMELINE.amountShine} travel={260} skew />
        </View>
        {cny ? (
          <View style={[styles.chip, { backgroundColor: color('--color-moment-chip') }]}>
            <AppText variant="meta" tone="secondaryLabel">
              {cny}
            </AppText>
          </View>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.group, titleIn]}>
        <InkText
          variant="moment-title"
          outline={vars['--sticker-border']}
          ink={PlatformColor('label')}
          accessibilityRole="header"
          testID="pay-celebration-title"
          style={styles.center}
        >
          {title}
        </InkText>
        <AppText
          variant="body"
          tone="secondaryLabel"
          style={styles.center}
          testID="pay-celebration-body"
        >
          {body}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: vars['--space-2'], alignItems: 'center', paddingHorizontal: vars['--space-5'] },
  group: { alignItems: 'center', gap: vars['--space-1'] },
  top: { fontWeight: '700', textAlign: 'center' },
  amount: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-1'],
  },
  chip: {
    borderRadius: vars['--radius-chip'],
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-1'],
  },
  center: { textAlign: 'center' },
});
