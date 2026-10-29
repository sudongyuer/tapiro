import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import type { CloseState } from './closeFlow';

export function CloseMenu({
  shown,
  state,
  onClose,
}: {
  shown: boolean;
  state: CloseState;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (state.kind === 'checking' || state.kind === 'sending') {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t(
              state.kind === 'sending' ? 'bounty.close.sending' : 'bounty.status.loading',
            )}
            testID="bounty-applicants-menu-busy"
            style={styles.busy}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon="ellipsis"
        accessibilityLabel={t('bounty.status.action.more')}
        hidden={!shown}
      >
        <Stack.Toolbar.MenuAction icon="xmark.circle" destructive onPress={onClose}>
          {t('bounty.close.menu')}
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});
