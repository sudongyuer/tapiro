import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';
import { localClock } from '@/lib/deviceClock';
import Animated from 'react-native-reanimated';

export function SectionHeading({
  title,
  count,
  sub,
  testID,
}: {
  title: string;
  count?: number;
  sub?: string;
  testID: string;
}) {
  const { t } = useI18n();
  const label =
    count === undefined
      ? [title, sub].filter(Boolean).join(' ')
      : t('ride.list.heading', { title, count });
  return (
    <View
      style={styles.heading}
      accessible
      accessibilityRole="header"
      accessibilityLabel={label}
      testID={testID}
    >
      <AppText variant="body" style={styles.headingTitle}>
        {title}
      </AppText>
      {count !== undefined ? (
        <AppText variant="secondary" tone="secondaryLabel">
          {count}
        </AppText>
      ) : null}
      {sub ? (
        <AppText variant="secondary" tone="secondaryLabel">
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

export function RideLoading() {
  const { t } = useI18n();
  return (
    <View style={styles.loading}>
      <ActivityIndicator accessibilityLabel={t('ride.list.loading')} testID="ride-list-loading" />
    </View>
  );
}

export function RideFailed({ busy, onRetry }: { busy: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <InlineState
      text={t('ride.list.failed')}
      action={{ label: t('ride.list.retry'), onPress: onRetry, testID: 'ride-list-retry', busy }}
      testID="ride-list-failed"
    />
  );
}

export function RideStale({
  loadedAt,
  busy,
  onRetry,
}: {
  loadedAt: string;
  busy: boolean;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <InlineState
      tone="warning"
      text={t('ride.list.stale', { time: localClock(Date.parse(loadedAt)) })}
      action={{ label: t('ride.list.retry'), onPress: onRetry, testID: 'ride-list-retry', busy }}
      testID="ride-list-stale"
    />
  );
}

export function HistoryRow({ count, onPress }: { count: number; onPress: () => void }) {
  const { t } = useI18n();
  const { select, highlight } = useSelectedUntilReturn();
  const label = t('ride.list.history', { count });
  return (
    <PressDim
      style={styles.row}
      onPress={() => {
        select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="ride-list-history"
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.selected, highlight]}
      />
      <SymbolView
        name="clock.arrow.circlepath"
        size={20}
        tintColor={PlatformColor('secondaryLabel')}
      />
      <AppText variant="body" style={styles.rowText} numberOfLines={2}>
        {label}
      </AppText>
      <SymbolView name="chevron.right" size={14} tintColor={PlatformColor('tertiaryLabel')} />
    </PressDim>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: vars['--space-2'],
    paddingTop: vars['--space-3'],
    paddingHorizontal: vars['--space-1'],
  },
  headingTitle: { fontWeight: '600' },
  loading: { minHeight: vars['--touch-min'] * 2, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingVertical: vars['--space-3'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  selected: { backgroundColor: PlatformColor('systemFill') },
  rowText: { flex: 1 },
});
