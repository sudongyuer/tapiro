import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export function StackToggle({
  count,
  open,
  onToggle,
}: {
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const label = open ? t('home.stack.collapse') : t('home.stack.fanOut', { count });
  return (
    <PressDim
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={open ? t('home.stack.collapseHint') : t('home.stack.fanOutHint')}
      testID="live-cards-toggle"
      onPress={() => onToggle(!open)}
      style={styles.toggle}
    >
      <View style={[styles.togglePill, { backgroundColor: color('--color-stage-bubble') }]}>
        <AppText variant="meta" style={[styles.toggleText, { color: color('--color-on-stage') }]}>
          {label}
        </AppText>
      </View>
    </PressDim>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'flex-end',
    minHeight: vars['--touch-min'],
    justifyContent: 'center',
    marginTop: vars['--space-2'],
  },
  togglePill: {
    opacity: 0.9,
    paddingHorizontal: vars['--space-3'],
    minHeight: vars['--space-7'] - vars['--space-1'],
    justifyContent: 'center',
    borderRadius: vars['--radius-pill'],
  },
  toggleText: { fontWeight: '700' },
});
