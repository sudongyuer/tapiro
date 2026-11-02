import { PlatformColor, ScrollView, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { RideTicket } from './RideTicket';
import { rideCache } from './services';
import { rideTicketView } from './ticketView';
import type { MyRide } from './types';
import { useNow } from './useNow';

export function RideDetailStub({ id }: { id: string }) {
  const { t, language } = useI18n();
  const ride = rideCache.get(id);
  const now = useNow();
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      testID="ride-detail"
    >
      {ride ? (
        <RideTicket
          view={rideTicketView(
            ride,
            { now, mine: ride && 'role' in ride ? (ride as MyRide) : null, showDay: true },
            t,
            language,
          )}
          testID="ride-detail-ticket"
        />
      ) : (
        <InlineState text={t('ride.detail.missing')} testID="ride-detail-missing" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: { paddingHorizontal: vars['--space-4'], paddingVertical: vars['--space-3'] },
});
