import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { typeStyle, vars } from '@/ui/theme/tokens';

import { moneyParts, moneyText, type PayDetail } from '../homeModel';
import { CardText, Pill } from './cardParts';

const TRACK_HEIGHT = 58;
const KNOB = 48;

export function PayCard({ detail }: { detail: PayDetail }) {
  const { t, language } = useI18n();
  const paint = useLiveCardPaint('pay');
  const ink = paint.ink;
  const amount = t('home.money', { amount: moneyText(detail.amountSen, language) });
  const { whole, cents } = moneyParts(detail.amountSen, language);
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
        {t('home.money', { amount: whole })}
        <AppText variant="moment-title" style={[styles.cents, { color: ink }]}>
          {cents}
        </AppText>
      </CardText>
      <View
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={t('home.card.pay.slideLabel', { amount })}
        accessibilityHint={t('home.soon')}
        style={styles.track}
      >
        <View style={[StyleSheet.absoluteFill, styles.trackFill, { backgroundColor: ink }]} />
        <AppText variant="secondary" numberOfLines={1} style={[styles.slide, { color: ink }]}>
          {t('home.card.pay.slide', { amount })}
        </AppText>
        <View style={[styles.knob, { backgroundColor: ink }]}>
          <SymbolView name="chevron.right" size={18} weight="bold" tintColor={paint.surface} />
        </View>
      </View>
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
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackFill: { opacity: 0.1 },
  slide: { textAlign: 'center', fontWeight: '600', opacity: 0.8, paddingLeft: KNOB },
  knob: {
    position: 'absolute',
    left: 5,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
