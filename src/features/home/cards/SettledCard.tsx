import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import type { SettledDetail } from '@/lib/liveItems';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { EarnedSticker } from '@/ui/EarnedSticker';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { PressDim } from '@/ui/PressDim';
import { token, vars } from '@/ui/theme/tokens';

import { TitleRow } from './BountyCard';
import { CardHeader, CardText, Pill } from './cardParts';
import { useSettledCollect } from './useSettledCollect';

const STICKER_WIDTH = 78;

export function SettledCard({
  detail,
  behind,
  onCollect,
  onLeave,
}: {
  detail: SettledDetail;
  behind: boolean;
  onCollect: () => void;
  onLeave: () => void;
}) {
  const { t, language } = useI18n();
  const { ink, surface, darkSurface } = useLiveCardPaint('progress');
  const success = token('--color-success', darkSurface ? 'dark' : 'light') as string;
  const amount = formatMoney(detail.amount, language, { whole: true });
  const { sticker, style, collect, collecting } = useSettledCollect({ onCollect, onLeave });
  return (
    <Animated.View style={style}>
      <LiveCard
        tone="progress"
        hanging={
          behind ? undefined : (
            <View ref={sticker} collapsable={false}>
              <EarnedSticker art={detail.art} width={STICKER_WIDTH} />
            </View>
          )
        }
      >
        <View
          accessible
          accessibilityLabel={t('home.card.settled.a11y', { line: detail.line, amount })}
          testID="live-card-settled"
        >
          <CardHeader
            left={
              <Pill ink={success} symbol="checkmark.circle.fill">
                {t('home.card.settled.tag')}
              </Pill>
            }
          />
          <CardText variant="secondary" ink={ink} muted style={styles.line}>
            {detail.line}
          </CardText>
          <TitleRow ink={ink} title={t('home.card.settled.headline')} amount={detail.amount} />
        </View>
        <PressDim
          accessibilityRole="button"
          accessibilityLabel={t('home.card.settled.collect')}
          disabled={behind || collecting}
          onPress={collect}
          testID="settled-card-collect"
          style={[styles.collect, { backgroundColor: ink }]}
        >
          <AppText
            variant="secondary"
            numberOfLines={1}
            style={[styles.collectLabel, { color: surface }]}
          >
            {t('home.card.settled.collect')}
          </AppText>
        </PressDim>
      </LiveCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: vars['--space-3'] },
  collect: {
    marginTop: vars['--space-3'],
    minHeight: vars['--touch-min'],
    paddingHorizontal: vars['--space-4'],
    borderRadius: vars['--radius-pill'],
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectLabel: { fontWeight: '700', textAlign: 'center' },
});
