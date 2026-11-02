import { useEffect, useState } from 'react';
import { PlatformColor, ScrollView, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { RideLoading } from './RideListParts';
import { rideCache, rideService } from './services';
import { TicketLink } from './TicketLink';
import type { RideSummary } from './types';
import { useNow } from './useNow';

type HistoryState =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; rides: RideSummary[] };

export function RideHistoryScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const now = useNow();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<HistoryState>({ kind: 'loading' });
  useEffect(() => {
    let live = true;
    rideService.history().then(
      (rides) => {
        rideCache.remember(rides);
        if (live) setState({ kind: 'ready', rides });
      },
      () => {
        if (live) setState({ kind: 'failed' });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const retry = () => {
    setState({ kind: 'loading' });
    setAttempt((count) => count + 1);
  };
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      testID="ride-history"
    >
      {state.kind === 'loading' ? <RideLoading /> : null}
      {state.kind === 'failed' ? (
        <InlineState
          text={t('ride.history.failed')}
          action={{ label: t('ride.list.retry'), onPress: retry, testID: 'ride-history-retry' }}
          testID="ride-history-failed"
        />
      ) : null}
      {state.kind === 'ready' && state.rides.length === 0 ? (
        <InlineState text={t('ride.history.empty')} testID="ride-history-empty" />
      ) : null}
      {state.kind === 'ready'
        ? state.rides.map((ride) => (
            <TicketLink key={ride.id} ride={ride} now={now} showDay onOpen={onOpen} />
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
