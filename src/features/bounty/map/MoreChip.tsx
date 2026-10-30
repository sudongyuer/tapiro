import { ActivityIndicator, PlatformColor, Pressable, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { MoreChip as Chip } from './mapLayout';

export function MoreChip({ chip, onPress }: { chip: Chip; onPress: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const busy = chip.page === 'loading';
  const failed = chip.page === 'failed';
  const label = failed
    ? `${t('bounty.board.state.pageFailed')} · ${t('bounty.board.state.retry')}`
    : t('bounty.board.map.more', { shown: chip.shown, total: chip.total, count: chip.count });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      testID={failed ? 'bounty-map-more-failed' : 'bounty-map-more'}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
          shadowColor: color('--color-sticker-shadow'),
        },
        pressed && styles.pressed,
      ]}
    >
      {busy ? <ActivityIndicator /> : null}
      <AppText variant="meta" numberOfLines={2} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--touch-min'],
    maxWidth: '90%',
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: { opacity: vars['--opacity-pressed'] },
  label: { fontWeight: '600', flexShrink: 1 },
});
