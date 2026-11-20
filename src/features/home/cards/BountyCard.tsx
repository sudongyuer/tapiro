import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { BountyCardDetail, OwedDetail } from '@/lib/liveItems';
import { formatMoney, type Money } from '@/lib/money';
import { HandArtSticker } from '@/ui/HandArt';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { vars } from '@/ui/theme/tokens';

import { ArtArrival } from './ArtArrival';
import { CardButton, CardHeader, CardText, Pill } from './cardParts';
import { useStackedBeside } from './useStackedBeside';

const TAG = {
  bountyAction: 'home.card.bounty.tag.action',
  bountyInProgress: 'home.card.bounty.tag.inProgress',
  waitingConfirm: 'home.card.bounty.tag.waiting',
} as const;

export type CardMessage = { onPress: () => void; busy: boolean };

export function BountyCard({
  detail,
  message,
}: {
  detail: BountyCardDetail;
  message?: CardMessage | null;
}) {
  const { t } = useI18n();
  const tone = detail.kind === 'waitingConfirm' ? 'calm' : 'progress';
  const { ink, surface, urgentDot } = useLiveCardPaint(tone);
  const action = detail.kind === 'bountyAction' ? detail.actionLabel : undefined;
  return (
    <LiveCard
      tone={tone}
      hanging={
        <ArtArrival bountyId={detail.bountyId}>
          <HandArtSticker source={detail} size={52} />
        </ArtArrival>
      }
    >
      <CardHeader
        left={
          <Pill ink={ink} dot={detail.kind === 'bountyAction' ? urgentDot : undefined}>
            {t(TAG[detail.kind])}
          </Pill>
        }
      />
      <CardText variant="secondary" ink={ink} muted style={styles.note}>
        {detail.line}
      </CardText>
      <TitleRow ink={ink} title={detail.title} amount={detail.reward} />
      {message ? (
        <View style={styles.actions}>
          <MessageButton message={message} ink={ink} surface={surface} />
          {action ? (
            <CardButton label={action} ink={ink} surface={surface} style={styles.fill} />
          ) : null}
        </View>
      ) : action ? (
        <CardButton label={action} ink={ink} surface={surface} style={styles.action} />
      ) : null}
    </LiveCard>
  );
}

export function OwedCard({ detail }: { detail: OwedDetail }) {
  const { t } = useI18n();
  const { ink } = useLiveCardPaint('progress');
  return (
    <LiveCard
      tone="progress"
      hanging={<HandArtSticker source={{ ...detail, title: detail.note }} size={52} />}
    >
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

export function TitleRow({ ink, title, amount }: { ink: string; title: string; amount: Money }) {
  const { language } = useI18n();
  const { stacked, onTextLayout } = useStackedBeside(`${language}|${title}`);
  return (
    <View style={[styles.titleRow, stacked && styles.titleStacked]}>
      <CardText
        variant="title"
        ink={ink}
        style={stacked ? styles.titleFull : styles.title}
        onTextLayout={onTextLayout}
      >
        {title}
      </CardText>
      <CardText variant="amount-compact" ink={ink} style={stacked && styles.amountStacked}>
        {formatMoney(amount, language, { whole: true })}
      </CardText>
    </View>
  );
}

function MessageButton({
  message,
  ink,
  surface,
}: {
  message: CardMessage;
  ink: string;
  surface: string;
}) {
  const { t } = useI18n();
  return (
    // Stays enabled while busy: a disabled Pressable passes the touch to the card, which opens the status screen.
    <CardButton
      label={t('home.card.bounty.message')}
      ink={ink}
      surface={surface}
      look="tinted"
      busy={message.busy}
      onPress={message.onPress}
      testID="live-card-message"
    />
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: vars['--space-2'],
    marginTop: vars['--space-4'],
  },
  fill: { flex: 1 },
  action: { marginTop: vars['--space-4'] },
  note: { marginTop: vars['--space-3'] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: vars['--space-3'],
    marginTop: vars['--space-1'],
  },
  titleStacked: { flexDirection: 'column', alignItems: 'stretch', gap: vars['--space-1'] },
  title: { flex: 1, fontWeight: '700' },
  titleFull: { fontWeight: '700' },
  amountStacked: { textAlign: 'right' },
});
