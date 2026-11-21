import { PlatformColor, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { localClock } from '@/lib/deviceClock';
import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { RideLoading } from './RideListParts';
import { TicketLink } from './TicketLink';
import { useRideHistory } from './useRideHistory';

export function RideHistoryScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const history = useRideHistory();
  const { state } = history;
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={history.pulling} onRefresh={history.pull} />}
      testID="ride-history"
    >
      {state.kind === 'loading' ? <RideLoading /> : null}
      {state.kind === 'failed' ? (
        <InlineState
          text={t('ride.history.failed')}
          action={{
            label: t('ride.list.retry'),
            onPress: () => void history.reload(),
            testID: 'ride-history-retry',
            busy: state.busy,
          }}
          testID="ride-history-failed"
        />
      ) : null}
      {state.kind === 'ready' && state.stale ? (
        <InlineState
          tone="warning"
          text={t('ride.history.stale', { time: localClock(Date.parse(state.loadedAt)) })}
          action={{
            label: t('ride.list.retry'),
            onPress: () => void history.reload(),
            testID: 'ride-history-stale-retry',
            busy: state.busy,
          }}
          testID="ride-history-stale"
        />
      ) : null}
      {state.kind === 'ready' && state.rides.length === 0 && !state.stale ? (
        <InlineState text={t('ride.history.empty')} testID="ride-history-empty" />
      ) : null}
      {state.kind === 'ready'
        ? state.rides.map((ride) => (
            <TicketLink
              key={ride.id}
              ride={ride}
              now={Date.parse(state.loadedAt)}
              showDay
              onOpen={onOpen}
            />
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: {
    paddingHorizontal: vars['--space-4'],
    paddingVertical: vars['--space-3'],
    gap: vars['--space-3'],
  },
});
