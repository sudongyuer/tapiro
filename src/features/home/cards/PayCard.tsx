import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney, moneyParts } from '@/lib/money';
import type { PayDetail } from '@/lib/liveItems';
import { AppText } from '@/ui/AppText';
import { HandArtSticker } from '@/ui/HandArt';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { typeStyle, vars } from '@/ui/theme/tokens';

import { CardButton, CardText, Pill } from './cardParts';

export function PayCard({ detail }: { detail: PayDetail }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const paint = useLiveCardPaint('pay');
  const ink = paint.ink;
  const amount = formatMoney(detail.amount, language, { whole: true });
  const { symbol, gap, whole, fraction } = moneyParts(detail.amount, language);
  return (
    <LiveCard
      tone="pay"
      hanging={<HandArtSticker source={{ ...detail, title: detail.note }} size={78} />}
    >
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
      <CardButton
        label={t('home.card.pay.button')}
        ink={ink}
        surface={paint.surface}
        accessibilityLabel={t('home.card.pay.buttonLabel', { amount })}
        disabled={detail.paymentId === null}
        onPress={() => detail.paymentId && router.push(`/pay/${detail.paymentId}`)}
        testID="pay-card-button"
      />
      <View style={styles.footer}>
        <CardText variant="meta" ink={ink} muted style={styles.footerText} numberOfLines={2}>
          {t('home.card.pay.footer', { name: detail.payee })}
        </CardText>
        <SymbolView
          name="chevron.right"
          size={12}
          tintColor={ink}
          style={styles.chevron}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </LiveCard>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: vars['--space-3'] },
  title: { fontWeight: '700', marginTop: vars['--space-1'] },
  amount: { marginTop: vars['--space-2'], marginBottom: vars['--space-4'] },
  cents: {
    ...typeStyle('moment-title'),
    fontFamily: vars['--font-rounded'],
    fontWeight: '800',
    opacity: 0.55,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vars['--space-3'],
    gap: vars['--space-2'],
  },
  footerText: { flex: 1 },
  chevron: { opacity: 0.6 },
});
