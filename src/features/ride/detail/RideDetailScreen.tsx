import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import {
  ActivityIndicator,
  PlatformColor,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useBlockPerson } from '@/features/block';
import { useI18n } from '@/lib/i18n';
import { useLiveOffline } from '@/lib/live';
import { InlineState } from '@/ui/InlineState';
import { OfflineLine } from '@/ui/OfflineLine';
import { vars } from '@/ui/theme/tokens';
import { localClock } from '@/lib/deviceClock';

import { departsAt } from '../rideTimes';
import { useNow } from '../useNow';
import { displayName } from './Avatars';
import { DetailBody } from './DetailBody';
import { DetailFooter } from './DetailFooter';
import { activeMembers, detailPhase, footer as footerFor } from './detailModel';
import { DetailSheets, useDetailSheets } from './DetailSheets';
import { DetailMenu } from './DetailMenu';
import { SettleSheets, useSettleSheets } from './SettleSheets';
import { useDetailActions } from './useDetailActions';
import { useSettleActions, type RideSettleBridge } from './useSettleActions';
import { useRideDetail } from './useRideDetail';

const TICK_MS = 15_000;

export function RideDetailScreen({
  id,
  userId,
  onGone,
  settle: bridge,
}: {
  id: string;
  userId: string;
  onGone: () => void;
  settle: RideSettleBridge;
}) {
  const { t } = useI18n();
  const now = useNow(TICK_MS);
  const { state, store } = useRideDetail(id, now, userId);
  const [titleShown, setTitleShown] = useState(false);
  const [routeBottom, setRouteBottom] = useState(Infinity);
  const [pulling, setPulling] = useState(false);
  const headerHeight = useHeaderHeight();
  const load = state.load;
  const ride = load.kind === 'ready' ? load.detail : null;
  const organiserName = ride?.organiser?.name ?? t('bounty.post.unknownName');
  const actions = useDetailActions(id, store, organiserName);
  const sheets = useDetailSheets(id, ride, now, actions);
  const settle = useSettleActions(id, store, bridge, t('bounty.post.unknownName'));
  const settleSheets = useSettleSheets(id, ride, settle);
  const blocking = useBlockPerson('rideOrganiser', onGone);
  const offline = useLiveOffline();

  if (load.kind === 'gone') {
    return (
      <View style={[styles.screen, styles.centre]}>
        <InlineState
          text={t('ride.detail.gone')}
          action={{ label: t('ride.detail.back'), onPress: onGone, testID: 'ride-detail-back' }}
          testID="ride-detail-gone"
        />
      </View>
    );
  }

  const route = ride ? t('ride.ticket.route', { from: ride.start.short, to: ride.dest.short }) : '';
  const action = state.action;
  const busy = action.kind === 'busy' ? action.action : null;
  const footer = ride ? footerFor(ride, now, userId) : { kind: 'none' as const };
  const arrivedNames = ride
    ? activeMembers(ride)
        .filter((m) => !m.organiser && m.arrivedAt)
        .map((m) => displayName(m, userId, t))
    : [];
  const departTime = ride ? localClock(departsAt(ride)) : '';
  const departLine =
    arrivedNames.length > 0
      ? t('ride.detail.meetup.departLine', {
          names: arrivedNames.join(t('ride.detail.listJoin')),
          time: departTime,
        })
      : t('ride.detail.meetup.departNone', { time: departTime });
  const stale = load.kind === 'ready' && load.stale;
  const meetup = ride !== null && detailPhase(ride, now) === 'meetup' && ride.members !== null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: titleShown ? route : '' }} />
      <DetailMenu
        ride={ride}
        now={now}
        blocking={blocking.state === 'busy'}
        onChoose={(item) => {
          if (!ride) return;
          if (item === 'block' && ride.organiser) blocking.ask(ride.organiser);
          if (item === 'leave') void actions.leave();
          if (item === 'cancel') void actions.cancel();
          if (item === 'reviseTime') sheets.openTime();
          if (item === 'editDetails') sheets.openDetails();
        }}
      />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        scrollEventThrottle={32}
        onScroll={(event) => {
          const past = event.nativeEvent.contentOffset.y + headerHeight > routeBottom;
          if (past !== titleShown) setTitleShown(past);
        }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={async () => {
              setPulling(true);
              await store.load();
              setPulling(false);
            }}
          />
        }
        testID="ride-detail"
      >
        {offline ? <OfflineLine text={t('live.offline')} testID="ride-detail-offline" /> : null}
        {load.kind === 'loading' ? (
          <ActivityIndicator
            accessibilityLabel={t('ride.detail.loading')}
            testID="ride-detail-loading"
          />
        ) : null}
        {load.kind === 'failed' ? (
          <InlineState
            text={t('ride.detail.failed')}
            action={{
              label: t('ride.detail.retry'),
              onPress: () => void store.load(),
              testID: 'ride-detail-retry',
              busy: load.busy,
            }}
            testID="ride-detail-failed"
          />
        ) : null}
        {stale && !meetup && load.kind === 'ready' ? (
          <InlineState
            tone="warning"
            text={t('ride.detail.stale', { time: localClock(load.loadedAt) })}
            action={{
              label: t('ride.detail.retry'),
              onPress: () => void store.load(),
              testID: 'ride-detail-stale-retry',
              busy: load.busy,
            }}
            testID="ride-detail-stale"
          />
        ) : null}
        {blocking.state === 'failed' ? (
          <InlineState tone="warning" text={t('block.failed')} testID="ride-detail-block-failed" />
        ) : null}
        {ride && load.kind === 'ready' ? (
          <DetailBody
            ride={ride}
            viewerId={userId}
            now={now}
            staleAt={stale ? load.loadedAt : null}
            action={action}
            actions={actions}
            onTicketLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setRouteBottom(vars['--space-2'] + y + height);
            }}
            onEditDetails={sheets.openDetails}
            settle={settle}
            onChangeShare={settleSheets.openChange}
            onReceipt={settleSheets.openReceipt}
          />
        ) : null}
      </ScrollView>
      <DetailFooter
        footer={footer}
        organiserName={organiserName}
        departLine={departLine}
        late={ride?.lateUntil != null}
        busy={busy}
        error={action.kind === 'failed' ? t(`ride.detail.errors.${action.reason}`) : null}
        actions={{
          apply: sheets.openApply,
          withdraw: () => void actions.withdraw(),
          arrive: actions.arrive,
          undoArrive: actions.undoArrive,
          late: actions.late,
          notComing: () => void actions.leave(),
          depart: sheets.openDepart,
          settle: {
            reach: () => void settleSheets.reach(),
            split: settleSheets.openSplit,
            pay: settle.pay,
            dispute: settleSheets.openDispute,
          },
        }}
      />
      <DetailSheets sheets={sheets} viewerId={userId} organiserName={organiserName} now={now} />
      <SettleSheets sheets={settleSheets} viewerId={userId} organiserName={organiserName} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  flex: { flex: 1 },
  centre: { justifyContent: 'center', padding: vars['--space-4'] },
  content: {
    paddingHorizontal: vars['--space-4'],
    paddingTop: vars['--space-2'],
    paddingBottom: vars['--space-6'],
    gap: vars['--space-3'],
  },
});
