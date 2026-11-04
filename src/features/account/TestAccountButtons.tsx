import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { uiVerify } from '@/lib/uiVerify';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import { TEST_ACCOUNTS, testAccountsEnabled, type TestAccount } from './testAccounts';

export const showTestAccounts = testAccountsEnabled({
  dev: __DEV__,
  verify: uiVerify,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
});

export function TestAccountButtons({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (account: TestAccount) => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.container} testID="sign-in-test-accounts">
      <AppText variant="secondary" tone="secondaryLabel" style={styles.caption}>
        {t('account.signIn.testAccounts')}
      </AppText>
      <View style={styles.row}>
        {TEST_ACCOUNTS.map((account) => (
          <View key={account.key} style={styles.cell}>
            <PillButton
              variant="secondary"
              label={t('account.signIn.testAccountAs', { name: account.name })}
              disabled={disabled}
              onPress={() => onPick(account)}
              testID={`sign-in-test-${account.key}`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: vars['--space-2'] },
  caption: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: vars['--space-3'] },
  cell: { flex: 1 },
});
