import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { SourceIssue } from '@/lib/liveItems';
import { liveItems } from '@/lib/useLiveItems';
import { LiveCard, useLiveCardPaint } from '@/ui/LiveCard';
import { vars } from '@/ui/theme/tokens';

import { CardButton, CardText } from './cardParts';

export function UnavailableCard({ issue }: { issue: SourceIssue }) {
  const { t } = useI18n();
  const { ink, surface } = useLiveCardPaint('calm');
  const loading = issue.status === 'loading';
  return (
    <LiveCard tone="calm">
      <View accessible testID={`live-card-unavailable-${issue.status}`}>
        <CardText variant="title" ink={ink} style={styles.title}>
          {loading ? t('home.card.unavailable.loading') : t('home.card.unavailable.title')}
        </CardText>
        {loading ? null : (
          <CardText variant="secondary" ink={ink} muted style={styles.body}>
            {t('home.card.unavailable.body')}
          </CardText>
        )}
      </View>
      {loading ? null : (
        <CardButton
          label={t('home.card.unavailable.retry')}
          ink={ink}
          surface={surface}
          look="outlined"
          onPress={() => liveItems.retry(issue.source)}
          testID="live-card-unavailable-retry"
          style={styles.button}
        />
      )}
    </LiveCard>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700' },
  body: { marginTop: vars['--space-1'] },
  button: { marginTop: vars['--space-4'] },
});
