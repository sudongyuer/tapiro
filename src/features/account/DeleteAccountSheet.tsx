import type { ParseKeys } from 'i18next';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { createInFlightGuard } from '@/lib/inFlightGuard';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { DeleteAccountFailure, DeleteAccountResult, UnsettledPayment } from './types';

const ITEMS: { key: ParseKeys; symbol: SFSymbol }[] = [
  { key: 'account.delete.items.profile', symbol: 'person.crop.circle' },
  { key: 'account.delete.items.payee', symbol: 'creditcard' },
  { key: 'account.delete.items.messages', symbol: 'bubble.left.and.bubble.right' },
  { key: 'account.delete.items.memory', symbol: 'brain' },
  { key: 'account.delete.items.coins', symbol: 'circle.circle' },
  { key: 'account.delete.items.stickers', symbol: 'seal' },
];

export function DeleteAccountSheet({
  onDelete,
  onCancel,
  onLayout,
}: {
  onDelete: () => Promise<DeleteAccountResult>;
  onCancel: () => void;
  onLayout?: () => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const [guard] = useState(createInFlightGuard);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<DeleteAccountFailure | null>(null);
  const [payments, setPayments] = useState<UnsettledPayment[]>([]);

  function confirm() {
    return guard(async () => {
      setPending(true);
      setFailure(null);
      const result = await onDelete();
      setPending(false);
      if (result.ok) return;
      setFailure(result.reason);
      setPayments(result.reason === 'blocked' ? result.payments : []);
    });
  }

  return (
    <View style={styles.sheet} onLayout={onLayout} testID="delete-account-sheet">
      <View style={styles.text}>
        <AppText variant="title" accessibilityRole="header">
          {t('account.delete.title')}
        </AppText>
        <AppText variant="secondary" tone="secondaryLabel">
          {t('account.delete.intro')}
        </AppText>
      </View>
      <View style={styles.items}>
        {ITEMS.map((item) => (
          <View key={item.key} style={styles.item}>
            <SymbolView name={item.symbol} size={22} tintColor={PlatformColor('secondaryLabel')} />
            <AppText variant="body" style={styles.itemLabel}>
              {t(item.key)}
            </AppText>
          </View>
        ))}
      </View>
      {failure && (
        <AppText
          variant="secondary"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID={`delete-account-message-${failure}`}
          style={{ color: color('--color-urgent') }}
        >
          {t(`account.delete.error.${failure}`)}
        </AppText>
      )}
      {payments.length > 0 && (
        <View style={styles.payments}>
          {payments.map((payment) => (
            <View
              key={payment.id}
              accessible
              testID={`delete-account-payment-${payment.id}`}
              style={styles.payment}
            >
              <AppText variant="body">{payment.title}</AppText>
              <AppText variant="secondary" tone="secondaryLabel">
                {t(`account.delete.payment.${payment.direction}`, {
                  name: payment.counterpartName,
                  amount: formatMoney(payment.amount, language),
                })}
              </AppText>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <PillButton
          label={pending ? t('account.delete.deleting') : t('account.delete.confirm')}
          variant="destructive"
          onPress={confirm}
          loading={pending}
          disabled={failure === 'blocked'}
          testID="delete-account-confirm"
        />
        <PillButton
          label={t('account.delete.cancel')}
          variant="plain"
          onPress={onCancel}
          disabled={pending}
          testID="delete-account-cancel"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: vars['--space-5'],
    paddingTop: vars['--space-6'],
    paddingBottom: vars['--space-2'],
    gap: vars['--space-5'],
  },
  text: { gap: vars['--space-2'] },
  items: { gap: vars['--space-3'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  itemLabel: { flex: 1 },
  actions: { gap: vars['--space-2'] },
  payments: {
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemBackground'),
  },
  payment: { padding: vars['--space-3'], gap: vars['--space-1'] },
});
