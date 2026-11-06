import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { InlineState } from '@/ui/InlineState';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { ItemKind } from '../types';
import type { ReviewEntry } from './entryView';
import { useReviewEntries } from './useReviewEntries';

const CHEVRON = 13;

function EntryRow({ entry, onOpen }: { entry: ReviewEntry; onOpen: (() => void) | null }) {
  const { color } = useTheme();
  const body = (
    <>
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={1} style={styles.title}>
          {entry.title}
        </AppText>
        {entry.detail ? (
          <AppText variant="meta" tone="secondaryLabel">
            {entry.detail}
          </AppText>
        ) : null}
      </View>
      {entry.trailing ? (
        <AppText
          variant="meta"
          tone="secondaryLabel"
          style={onOpen && entry.detail ? { color: color('--color-accent') } : null}
        >
          {entry.trailing}
        </AppText>
      ) : null}
      {onOpen ? (
        <SymbolView
          name="chevron.right"
          size={CHEVRON}
          tintColor={PlatformColor('tertiaryLabel')}
        />
      ) : null}
    </>
  );
  if (!onOpen) {
    return (
      <View
        accessible
        accessibilityLabel={entry.label}
        style={styles.row}
        testID={`review-entry-${entry.id}`}
      >
        {body}
      </View>
    );
  }
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={entry.label}
      onPress={onOpen}
      style={styles.row}
      testID={`review-entry-${entry.id}`}
    >
      {body}
    </PressDim>
  );
}

export function ReviewEntryCard({
  kind,
  itemId,
  title,
}: {
  kind: ItemKind;
  itemId: string;
  title: string;
}) {
  const { t } = useI18n();
  const { entries, failed, stale, retry, open } = useReviewEntries(kind, itemId, title);
  const again = {
    label: t('reputation.profile.retry'),
    onPress: retry,
    testID: 'review-entries-retry',
  };
  if (failed) {
    return (
      <InlineState
        tone="warning"
        text={t('reputation.entry.failed')}
        action={again}
        testID="review-entries-failed"
      />
    );
  }
  if (entries.length === 0) return null;
  return (
    <View style={styles.block}>
      {stale ? (
        <InlineState
          tone="warning"
          text={t('reputation.entry.stale')}
          action={again}
          testID="review-entries-stale"
        />
      ) : null}
      <AppText variant="meta" tone="secondaryLabel" style={styles.heading}>
        {t('reputation.entry.section')}
      </AppText>
      <View style={styles.card} testID="review-entries">
        {entries.map((entry, index) => {
          const { target } = entry;
          return (
            <View key={entry.id} style={index > 0 && styles.divided}>
              <EntryRow entry={entry} onOpen={target ? () => open(target) : null} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: vars['--space-2'] },
  heading: { paddingHorizontal: vars['--space-4'] },
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PlatformColor('separator'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-3'],
  },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
});
