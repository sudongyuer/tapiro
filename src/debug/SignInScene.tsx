import { PlatformColor, ScrollView, StyleSheet } from 'react-native';

import { SignInButtons, useSession } from '@/features/account';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

export function SignInScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const session = useSession();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={styles.content}
      onLayout={onReady}
    >
      <AppText variant="body" testID={`account-session-${session.status}`}>
        {session.status === 'signedIn'
          ? t('debug.account.signedIn', { name: session.user.name ?? session.user.email ?? '' })
          : t(`debug.account.${session.status}`)}
      </AppText>
      <SignInButtons />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { padding: vars['--space-4'], gap: vars['--space-4'] },
});
