import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

import type { SettleFooter } from './settleModel';

export type SettleFooterActions = {
  reach: () => void;
  split: () => void;
  pay: (paymentId: string) => void;
  dispute: () => void;
};

export function SettleFooterBar({
  footer,
  organiserName,
  busy,
  actions,
}: {
  footer: SettleFooter;
  organiserName: string;
  busy: string | null;
  actions: SettleFooterActions;
}) {
  const { t, language } = useI18n();
  switch (footer.kind) {
    case 'reach':
      return (
        <PillButton
          label={t(footer.grab ? 'rideSettle.footer.reachGrab' : 'rideSettle.footer.reach')}
          loading={busy === 'reach'}
          onPress={actions.reach}
          testID="ride-detail-reach"
        />
      );
    case 'split':
      return (
        <PillButton
          label={t('rideSettle.footer.split')}
          loading={busy === 'split'}
          onPress={actions.split}
          testID="ride-detail-split"
        />
      );
    case 'waitSplit':
      return (
        <Line
          testID="ride-detail-wait-split"
          text={t('rideSettle.footer.waitSplit', { name: organiserName })}
        />
      );
    case 'pay':
      return (
        <>
          {footer.disputed ? (
            <AppText
              variant="meta"
              tone="secondaryLabel"
              style={styles.centre}
              testID="ride-detail-disputed"
            >
              {t('rideSettle.footer.disputed', { name: organiserName })}
            </AppText>
          ) : null}
          <View style={styles.row}>
            <PillButton
              label={t('rideSettle.footer.wrong')}
              variant="secondary"
              loading={busy === 'dispute'}
              onPress={actions.dispute}
              testID="ride-detail-dispute"
            />
            <View style={styles.flex}>
              <PillButton
                label={t('rideSettle.footer.pay', {
                  name: organiserName,
                  amount: formatMoney(footer.share, language),
                })}
                onPress={() => actions.pay(footer.paymentId)}
                testID="ride-detail-pay"
              />
            </View>
          </View>
        </>
      );
    case 'paid':
      return (
        <View style={styles.row}>
          <AppText variant="body" style={[styles.flex, styles.bold]} testID="ride-detail-paid">
            {t('rideSettle.footer.paid', { name: organiserName })}
          </AppText>
          <PillButton
            label={t('rideSettle.footer.view')}
            variant="secondary"
            onPress={() => actions.pay(footer.paymentId)}
            testID="ride-detail-paid-view"
          />
        </View>
      );
    case 'mineSettled':
      return <Line testID="ride-detail-mine-settled" text={t('rideSettle.footer.mineSettled')} />;
  }
}

function Line({ text, testID }: { text: string; testID: string }) {
  return (
    <AppText variant="body" style={[styles.centre, styles.bold]} testID={testID}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
  centre: { textAlign: 'center' },
});
