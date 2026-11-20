import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import type { SettledDetail } from '@/lib/liveItems';
import { formatMoney } from '@/lib/money';
import { HandArt } from '@/ui/HandArt';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { token, vars } from '@/ui/theme/tokens';

import { TitleRow } from './BountyCard';
import { CardButton, CardHeader, CardText, Pill } from './cardParts';
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
  const { sticker, card, style, collect, collecting } = useSettledCollect({ onCollect, onLeave });
  return (
    <Animated.View ref={card} collapsable={false} style={style}>
      <LiveCard
        tone="progress"
        hanging={
          behind ? undefined : (
            <View ref={sticker} collapsable={false}>
              <HandArt id={detail.art} size={STICKER_WIDTH} />
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
        <CardButton
          label={t('home.card.settled.collect')}
          ink={ink}
          surface={surface}
          disabled={behind || collecting}
          onPress={collect}
          testID="settled-card-collect"
          style={styles.collect}
        />
      </LiveCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: { marginTop: vars['--space-3'] },
  collect: { marginTop: vars['--space-3'] },
});
