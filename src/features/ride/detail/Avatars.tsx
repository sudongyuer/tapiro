import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { localClock } from '@/lib/deviceClock';

import { activeMembers, arrival, emptySeats, type Arrival } from './detailModel';
import type { RideDetail, RideMember } from './types';

const SEAT = 28;
const FACE = 36;
const RING = 2;

export function displayName(
  member: { id: string; name: string | null },
  viewerId: string,
  t: (key: 'ride.detail.you' | 'bounty.post.unknownName') => string,
) {
  if (member.id === viewerId) return t('ride.detail.you');
  return member.name ?? t('bounty.post.unknownName');
}

function Initial({ name, size, dark }: { name: string; size: number; dark?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={[
        styles.initial,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: dark ? color('--color-accent') : color('--color-card-calm') },
      ]}
    >
      <AppText
        variant="meta"
        style={[
          styles.letter,
          { color: dark ? color('--color-on-accent') : color('--color-on-card-calm') },
        ]}
      >
        {nameInitial(name)}
      </AppText>
    </View>
  );
}

function EmptySeat({ hidden }: { hidden: boolean }) {
  return (
    <View style={[styles.seat, hidden ? styles.hiddenSeat : styles.dashed]}>
      <SymbolView
        name={hidden ? 'person.fill' : 'plus'}
        size={hidden ? 13 : 11}
        tintColor={PlatformColor(hidden ? 'secondaryLabel' : 'tertiaryLabel')}
      />
    </View>
  );
}

export function SeatRow({ ride, viewerId }: { ride: RideDetail; viewerId: string }) {
  const { t } = useI18n();
  const inside = ride.members !== null;
  const empty = emptySeats(ride);
  const people = inside ? activeMembers(ride) : [];
  const hidden = inside ? 0 : Math.max(0, ride.taken - 1);
  const organiserName = ride.organiser?.name ?? t('bounty.post.unknownName');
  const label = inside
    ? [
        ...people.map((m) => displayName(m, viewerId, t)),
        t('ride.detail.seatsLeft', { count: empty }),
      ].join('，')
    : t('ride.detail.seatsA11y', { name: organiserName, taken: ride.taken, empty });
  return (
    <View style={styles.row} accessible accessibilityLabel={label} testID="ride-detail-seats">
      {inside ? (
        people.map((m) => (
          <Initial
            key={m.id}
            name={displayName(m, viewerId, t)}
            size={SEAT}
            dark={m.id === viewerId}
          />
        ))
      ) : (
        <Initial name={organiserName} size={SEAT} />
      )}
      {Array.from({ length: hidden }, (_, index) => (
        <EmptySeat key={`hidden-${index}`} hidden />
      ))}
      {Array.from({ length: empty }, (_, index) => (
        <EmptySeat key={`empty-${index}`} hidden={false} />
      ))}
      {!inside && empty > 0 ? (
        <AppText variant="meta" tone="secondaryLabel">
          {t('ride.detail.seatsLeft', { count: empty })}
        </AppText>
      ) : null}
    </View>
  );
}

function stateText(state: Arrival, t: ReturnType<typeof useI18n>['t']) {
  switch (state.kind) {
    case 'arrived':
      return localClock(state.at);
    case 'late':
      return state.passed
        ? t('ride.detail.arrival.said', { time: localClock(state.until) })
        : t('ride.detail.arrival.late', { count: state.minutes });
    default:
      return t('ride.detail.arrival.waiting');
  }
}

export function ArrivalRow({
  ride,
  viewerId,
  now,
}: {
  ride: RideDetail;
  viewerId: string;
  now: number;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <View style={styles.arrivals} testID="ride-detail-arrivals">
      {activeMembers(ride).map((member: RideMember) => {
        const state = arrival(member, now);
        const name = displayName(member, viewerId, t);
        const ring =
          state.kind === 'arrived'
            ? color('--color-success')
            : state.kind === 'late'
              ? color('--color-warning')
              : null;
        const text = stateText(state, t);
        return (
          <View
            key={member.id}
            style={styles.arrival}
            accessible
            accessibilityLabel={t('ride.detail.arrival.a11y', { name, state: text })}
            testID={`ride-detail-arrival-${member.id}`}
          >
            <View
              style={[
                styles.face,
                ring ? { borderColor: ring, borderStyle: 'solid' } : styles.faceWaiting,
              ]}
            >
              <Initial name={name} size={FACE - RING * 4} dark={member.id === viewerId} />
            </View>
            <AppText variant="meta" numberOfLines={1} style={styles.faceName}>
              {name}
            </AppText>
            <AppText
              variant="meta"
              numberOfLines={1}
              style={[
                styles.faceState,
                ring ? { color: ring } : { color: PlatformColor('secondaryLabel') },
              ]}
            >
              {text}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: vars['--space-1'] },
  initial: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700' },
  seat: {
    width: SEAT,
    height: SEAT,
    borderRadius: SEAT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: { borderWidth: 1, borderStyle: 'dashed', borderColor: PlatformColor('tertiaryLabel') },
  hiddenSeat: { backgroundColor: PlatformColor('tertiarySystemFill') },
  arrivals: { flexDirection: 'row', flexWrap: 'wrap', rowGap: vars['--space-2'] },
  arrival: { width: '25%', alignItems: 'center', gap: 2 },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    borderWidth: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceWaiting: { borderStyle: 'dashed', borderColor: PlatformColor('tertiaryLabel') },
  faceName: { maxWidth: '100%', paddingHorizontal: 2 },
  faceState: { fontWeight: '600', maxWidth: '100%' },
});
