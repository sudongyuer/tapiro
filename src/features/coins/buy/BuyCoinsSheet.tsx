import { Form, Host, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  font,
  foregroundStyle,
  listRowBackground,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import { useCoinBalance } from '../hooks';
import { coinCount } from '../page/coinsView';
import { CoinPacks } from './CoinPacks';

export const BUY_COINS_SHEET_OPTIONS: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: [0.65, 1],
  sheetGrabberVisible: true,
  headerShown: true,
  headerLargeTitleEnabled: false,
  scrollEdgeEffects: { top: 'automatic' },
};

export function BuyCoinsSheet({ onClose }: { onClose: () => void }) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const balance = useCoinBalance();
  const coins = balance.status === 'idle' ? null : (balance.data?.coins ?? null);
  return (
    <>
      <Stack.Screen options={{ title: t('coins.buy.title') }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('coins.buy.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      <Host style={styles.host} testID="buy-coins">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {coins !== null ? (
            <Section modifiers={[listRowBackground('clear')]}>
              <Text
                modifiers={[
                  font({ textStyle: 'subheadline' }),
                  foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
                  accessibilityIdentifier('buy-coins-balance'),
                ]}
              >
                {t('coins.buy.balance', { balance: coinCount(coins, language) })}
              </Text>
            </Section>
          ) : null}
          <CoinPacks testID="buy-coins" footer={t('coins.buy.note')} />
        </Form>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
