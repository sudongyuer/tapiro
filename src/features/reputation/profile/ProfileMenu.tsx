import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

export type ProfileMenuChoice = 'report' | 'block' | 'unblock';

export function ProfileMenu({
  name,
  blocked,
  hidden,
  busy,
  onChoose,
}: {
  name: string;
  blocked: boolean;
  hidden: boolean;
  busy: boolean;
  onChoose: (choice: ProfileMenuChoice) => void;
}) {
  const { t } = useI18n();
  if (busy) {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ActivityIndicator
            accessible
            accessibilityLabel={t('block.blocking')}
            testID="profile-menu-busy"
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
        accessibilityLabel={t('reputation.profile.more')}
        hidden={hidden}
      >
        <Stack.Toolbar.MenuAction icon="exclamationmark.bubble" onPress={() => onChoose('report')}>
          {t('reputation.profile.report', { name })}
        </Stack.Toolbar.MenuAction>
        {blocked ? (
          <Stack.Toolbar.MenuAction icon="hand.raised.slash" onPress={() => onChoose('unblock')}>
            {t('reputation.profile.unblock', { name })}
          </Stack.Toolbar.MenuAction>
        ) : (
          <Stack.Toolbar.MenuAction
            icon="hand.raised"
            destructive
            onPress={() => onChoose('block')}
          >
            {t('reputation.profile.block', { name })}
          </Stack.Toolbar.MenuAction>
        )}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

const styles = StyleSheet.create({
  busy: { minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] },
});
