import { useRouter } from 'expo-router';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { usePendingReviews } from '../hooks';
import { personName } from '../profile/profileView';
import type { PendingReview } from '../types';
import { pendingLine, stillOpen } from './entryView';
import { reviewHref } from './ReviewRoute';

function PendingCard({ row, reviewee }: { row: PendingReview; reviewee: string }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const router = useRouter();
  const name = personName(row.counterpart?.name ?? null, t);
  const line = pendingLine(row, name, t);
  const ask = t('reputation.home.ask');
  const action = t('reputation.home.action');
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={`${line}${t('reputation.profile.listJoin')}${ask}`}
      accessibilityHint={t('reputation.entry.review', { name })}
      onPress={() =>
        router.push(reviewHref({ kind: row.kind, itemId: row.itemId, reviewee }, row.title))
      }
      style={styles.card}
      testID={`home-review-${row.kind}-${row.itemId}-${reviewee}`}
    >
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={2} style={styles.line}>
          {line}
        </AppText>
        <AppText variant="meta" tone="secondaryLabel">
          {ask}
        </AppText>
      </View>
      <View style={[styles.pill, { backgroundColor: color('--color-accent') }]}>
        <AppText variant="secondary" style={[styles.action, { color: color('--color-on-accent') }]}>
          {action}
        </AppText>
      </View>
    </PressDim>
  );
}

export function PendingReviewCards() {
  const pending = usePendingReviews();
  const now = new Date();
  const rows = pending.status === 'idle' ? [] : (pending.data ?? []);
  const shown = rows.filter((row) => row.counterpart && stillOpen(row, now));
  if (shown.length === 0) return null;
  return (
    <View style={styles.list} testID="home-reviews">
      {shown.map((row) => {
        const reviewee = row.counterpart?.id ?? '';
        return (
          <PendingCard
            key={`${row.kind}:${row.itemId}:${reviewee}`}
            row={row}
            reviewee={reviewee}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: vars['--space-2'], marginTop: vars['--space-3'] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    padding: vars['--space-3'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  text: { flex: 1, gap: 2 },
  line: { fontWeight: '600' },
  pill: {
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
  },
  action: { fontWeight: '600' },
});
