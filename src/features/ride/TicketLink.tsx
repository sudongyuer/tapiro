import { PlatformColor, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import { RideTicket } from './RideTicket';
import { rideTicketView } from './ticketView';
import type { MyRide, RideSummary } from './types';

export function TicketLink({
  ride,
  mine,
  now,
  showDay,
  onOpen,
}: {
  ride: RideSummary;
  mine?: MyRide;
  now: number;
  showDay: boolean;
  onOpen: (id: string) => void;
}) {
  const { t, language } = useI18n();
  const { select, highlight } = useSelectedUntilReturn();
  const view = rideTicketView(ride, { now, mine: mine ?? null, showDay }, t, language);
  return (
    <RideTicket
      view={view}
      onPress={() => {
        select();
        onOpen(ride.id);
      }}
      overlay={<Animated.View pointerEvents="none" style={[styles.selected, highlight]} />}
      testID={`ride-ticket-${ride.id}`}
    />
  );
}

const styles = StyleSheet.create({
  selected: { ...StyleSheet.absoluteFill, backgroundColor: PlatformColor('systemFill') },
});
