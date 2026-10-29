import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney, moneyParts } from '@/lib/money';
import type { PayDetail } from '@/lib/liveItems';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { typeStyle, vars } from '@/ui/theme/tokens';

import { CardText, Pill } from './cardParts';

const BUTTON_HEIGHT = 52;

export function PayCard({ detail }: { detail: PayDetail }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const paint = useLiveCardPaint('pay');
  const ink = paint.ink;
  const amount = formatMoney(detail.amount, language, { whole: true });
  const { symbol, gap, whole, fraction } = moneyParts(detail.amount, language);
  return (
    <LiveCard tone="pay" hanging={<CategorySticker category={detail.category} size={78} />}>
      <Pill ink={ink} dot={paint.urgentDot}>
        {t('home.card.pay.tag')}
      </Pill>
      <CardText variant="secondary" ink={ink} muted style={styles.note}>
        {detail.note}
      </CardText>
      <CardText variant="title" ink={ink} style={styles.title}>
        {t('home.card.pay.title', { name: detail.payee })}
      </CardText>
      <CardText variant="amount" ink={ink} style={styles.amount}>
        {`${symbol}${gap}${whole}`}
        <AppText variant="moment-title" style={[styles.cents, { color: ink }]}>
          {fraction}
        </AppText>
      </CardText>
      <PressDim
        accessibilityRole="button"
        accessibilityState={{ disabled: detail.paymentId === null }}
        accessibilityLabel={t('home.card.pay.buttonLabel', { amount })}
        disabled={detail.paymentId === null}
        onPress={() => detail.paymentId && router.push(`/pay/${detail.paymentId}`)}
        testID="pay-card-button"
        style={[styles.button, { backgroundColor: ink }]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          style={[styles.buttonLabel, { color: paint.surface }]}
        >
          {t('home.card.pay.button')}
        </AppText>
      </PressDim>
      <View style={styles.footer}>
        <CardText variant="meta" ink={ink} muted style={styles.footerText} numberOfLines={2}>
          {t('home.card.pay.footer', { name: detail.payee })}
        </CardText>
        <SymbolView name="chevron.right" size={12} tintColor={ink} style={styles.chevron} />
      </View>
    </LiveCard>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: vars['--space-3'] },
  title: { fontWeight: '700', marginTop: 2 },
  amount: { marginTop: vars['--space-2'], marginBottom: vars['--space-4'] },
  cents: {
    ...typeStyle('moment-title'),
    fontFamily: vars['--font-rounded'],
    fontWeight: '800',
    opacity: 0.55,
  },
  button: {
    minHeight: BUTTON_HEIGHT,
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: vars['--space-5'],
  },
  buttonLabel: { fontWeight: '600', textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vars['--space-3'],
    gap: vars['--space-2'],
  },
  footerText: { flex: 1 },
  chevron: { opacity: 0.6 },
});
