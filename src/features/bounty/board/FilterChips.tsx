import { Pressable, PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { BoardFilter } from './types';

const CHIP_HEIGHT = 32;

const FILTERS = [
  { filter: 'all', key: 'bounty.board.filter.all', testID: 'bounty-filter-all' },
  { filter: 'urgent', key: 'bounty.board.filter.urgent', testID: 'bounty-filter-urgent' },
  { filter: 'fits_my_time', key: 'bounty.board.filter.fits', testID: 'bounty-filter-fits' },
] as const;

export function FilterChips({
  filter,
  total,
  onChange,
}: {
  filter: BoardFilter;
  total: number | null;
  onChange: (filter: BoardFilter) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      {FILTERS.map((chip) => {
        const selected = chip.filter === filter;
        const label =
          selected && chip.filter === 'all' && total !== null
            ? t('bounty.board.filter.allCount', { count: total })
            : t(chip.key);
        return (
          <Pressable
            key={chip.filter}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            testID={chip.testID}
            onPress={() => onChange(chip.filter)}
            style={styles.target}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? color('--color-accent')
                      : PlatformColor('secondarySystemGroupedBackground'),
                  },
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="secondary"
                  numberOfLines={1}
                  style={[styles.label, selected ? { color: color('--color-on-accent') } : null]}
                >
                  {label}
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: vars['--space-2'] },
  target: { minHeight: vars['--touch-min'], justifyContent: 'center' },
  chip: {
    minHeight: CHIP_HEIGHT,
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  pressed: { opacity: vars['--opacity-pressed'] },
  label: { fontWeight: '600' },
});
