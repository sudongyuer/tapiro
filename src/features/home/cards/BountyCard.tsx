import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { CategorySticker } from '@/ui/CategorySticker';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { vars } from '@/ui/theme/tokens';

import type { OwedDetail, ProgressDetail } from '../homeModel';
import { CardHeader, CardText, Pill } from './cardParts';

export function ProgressCard({ detail }: { detail: ProgressDetail }) {
  const { t } = useI18n();
  const { ink, surface } = useLiveCardPaint('progress');
  return (
    <LiveCard tone="progress" hanging={<CategorySticker category={detail.category} size={52} />}>
      <CardHeader left={<Pill ink={ink}>{t('home.card.progress.tag')}</Pill>} />
      <CardText variant="secondary" ink={ink} muted style={styles.note}>
        {`${detail.when} · ${t('home.card.progress.helper', { name: detail.helper })}`}
      </CardText>
      <TitleRow ink={ink} title={detail.title} amount={detail.amount} />
      <View style={styles.actions}>
        <InertAction
          label={t('home.card.progress.message', { name: detail.helper })}
          fill={ink}
          ink={surface}
          wide
        />
        <InertAction label={t('home.card.progress.details')} ink={ink} />
      </View>
    </LiveCard>
  );
}

export function OwedCard({ detail }: { detail: OwedDetail }) {
  const { t } = useI18n();
  const { ink } = useLiveCardPaint('progress');
  return (
    <LiveCard tone="progress" hanging={<CategorySticker category={detail.category} size={52} />}>
      <CardHeader left={<Pill ink={ink}>{t('home.card.owed.tag')}</Pill>} />
      <CardText variant="secondary" ink={ink} muted style={styles.note}>
        {detail.note}
      </CardText>
      <TitleRow
        ink={ink}
        title={t('home.card.owed.title', { name: detail.payer })}
        amount={detail.amount}
      />
    </LiveCard>
  );
}

function TitleRow({ ink, title, amount }: { ink: string; title: string; amount: number }) {
  const { t } = useI18n();
  return (
    <View style={styles.titleRow}>
      <CardText variant="title" ink={ink} style={styles.title}>
        {title}
      </CardText>
      <CardText variant="large-title" ink={ink} style={styles.amount}>
        {t('home.money', { amount })}
      </CardText>
    </View>
  );
}

function InertAction({
  label,
  ink,
  fill,
  wide = false,
}: {
  label: string;
  ink: string;
  fill?: string;
  wide?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={label}
      accessibilityHint={t('home.soon')}
      style={[styles.action, wide && styles.wide]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.actionFill,
          fill ? { backgroundColor: fill } : [styles.faint, { backgroundColor: ink }],
        ]}
      />
      <AppText variant="secondary" numberOfLines={1} style={[styles.actionText, { color: ink }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: vars['--space-3'] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: vars['--space-3'],
    marginTop: 2,
  },
  title: { flex: 1, fontWeight: '700' },
  amount: { fontFamily: vars['--font-rounded'], fontWeight: '800' },
  actions: { flexDirection: 'row', gap: vars['--space-2'], marginTop: vars['--space-4'] },
  action: {
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wide: { flex: 1 },
  actionFill: { borderRadius: vars['--radius-pill'] },
  faint: { opacity: 0.08 },
  actionText: { fontWeight: '700' },
});
