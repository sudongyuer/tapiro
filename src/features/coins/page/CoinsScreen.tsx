import { Form, Host, ProgressView, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  listRowBackground,
  monospacedDigit,
  multilineTextAlignment,
  refreshable,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { Loadable } from '@/lib/loadable';
import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { useCoinBalance, useCoinHistory, useCoinsReadFailed } from '../hooks';
import { coinsStore } from '../services';
import type { CoinBalance } from '../types';
import { CoinsHistory } from './CoinsHistory';
import { coinCount } from './coinsView';

const missing = (value: Loadable<unknown>) => value.status === 'failed';
const shown = <T,>(value: Loadable<T>) => (value.status === 'idle' ? null : value.data);

export function CoinsScreen() {
  const { t } = useI18n();
  const { color } = useTheme();
  const balance = useCoinBalance();
  const history = useCoinHistory();
  const balanceFailed = useCoinsReadFailed('balance');
  const historyFailed = useCoinsReadFailed('history');
  const balanceData = shown(balance);
  const historyData = shown(history);
  const stale =
    (balance.status === 'stale' && balanceFailed && balanceData !== null) ||
    (history.status === 'stale' && historyFailed && historyData !== null);
  const reload = () =>
    Promise.all([coinsStore.reloadBalance(), coinsStore.reloadHistory()]).then(() => undefined);
  const retry = (testID: string) => ({
    label: t('coins.retry'),
    onPress: () => void reload(),
    testID,
  });
  return (
    <Host style={styles.host} testID="coins-screen">
      <Form modifiers={[tint(color('--color-accent')), refreshable(reload)]}>
        {stale ? (
          <NoticeCard
            tone="warning"
            icon="exclamationmark.triangle.fill"
            title={t('coins.stale')}
            action={retry('coins-stale-retry')}
            testID="coins-stale"
          />
        ) : null}
        {missing(balance) || missing(history) ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('coins.failed')}
            action={retry('coins-retry')}
            testID="coins-failed"
          />
        ) : null}
        {balanceData ? <BalanceHeader balance={balanceData} /> : null}
        {historyData ? <CoinsHistory history={historyData} /> : null}
        {(!balanceData && !missing(balance)) || (!historyData && !missing(history)) ? (
          <Section>
            <ProgressView
              modifiers={[
                accessibilityLabel(t('coins.loading')),
                accessibilityIdentifier('coins-loading'),
              ]}
            />
          </Section>
        ) : null}
      </Form>
    </Host>
  );
}

function BalanceHeader({ balance }: { balance: CoinBalance }) {
  const { t, language } = useI18n();
  const freePosts = t('coins.freePosts', {
    left: balance.freePostsLeft,
    total: balance.freePostsPerMonth,
  });
  return (
    <Section modifiers={[listRowBackground('clear')]}>
      <VStack
        spacing={vars['--space-1']}
        modifiers={[
          frame({ maxWidth: Infinity }),
          accessibilityElement('ignore'),
          accessibilityLabel(
            [t('coins.balanceA11y', { count: balance.coins }), freePosts].join(t('coins.listJoin')),
          ),
          accessibilityIdentifier('coins-balance'),
        ]}
      >
        <Text
          modifiers={[
            font({ textStyle: 'largeTitle', weight: 'bold', design: 'rounded' }),
            monospacedDigit(),
          ]}
        >
          {coinCount(balance.coins, language)}
        </Text>
        <Text
          modifiers={[
            font({ textStyle: 'subheadline' }),
            foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            multilineTextAlignment('center'),
          ]}
        >
          {freePosts}
        </Text>
      </VStack>
    </Section>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
