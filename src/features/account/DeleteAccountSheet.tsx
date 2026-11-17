import type { ParseKeys } from 'i18next';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { PlatformColor, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
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
    <View
      style={[styles.sheet, { maxHeight: height - top - bottom - vars['--space-6'] }]}
      onLayout={onLayout}
      testID="delete-account-sheet"
    >
      {/* react-native-screens resizes the first ScrollView on a form sheet's first-subview chain to the whole
          screen frame, which moved this list below the sheet; this spacer keeps the list off that chain. */}
      <View collapsable={false} style={styles.top} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        alwaysBounceVertical={false}
        testID="delete-account-scroll"
      >
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
            <View key={item.key} accessible accessibilityLabel={t(item.key)} style={styles.item}>
              <SymbolView
                name={item.symbol}
                size={22}
                tintColor={PlatformColor('secondaryLabel')}
              />
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
      </ScrollView>
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
  sheet: { flexShrink: 1, paddingBottom: vars['--space-2'] },
  top: { height: vars['--space-6'] },
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: vars['--space-5'],
    paddingBottom: vars['--space-5'],
    gap: vars['--space-5'],
  },
  text: { gap: vars['--space-2'] },
  items: { gap: vars['--space-3'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  itemLabel: { flex: 1 },
  actions: { paddingHorizontal: vars['--space-5'], gap: vars['--space-2'] },
  payments: {
    borderRadius: vars['--radius-chip'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemBackground'),
  },
  payment: { padding: vars['--space-3'], gap: vars['--space-1'] },
});
