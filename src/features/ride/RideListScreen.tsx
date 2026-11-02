import { Stack } from 'expo-router';
import { PlatformColor, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { InlineState } from '@/ui/InlineState';
import { vars } from '@/ui/theme/tokens';

import { rideListModel } from './listModel';
import { RideEmpty } from './RideEmpty';
import { HistoryRow, RideFailed, RideLoading, RideStale, SectionHeading } from './RideListParts';
import { TicketLink } from './TicketLink';
import { dayText } from './ticketView';
import { useNow } from './useNow';
import { useRideList } from './useRideList';

type Actions = { onAdd: () => void; onOpen: (id: string) => void; onHistory: () => void };

export function RideListScreen(actions: Actions) {
  const { t } = useI18n();
  const list = useRideList();
  const now = useNow();
  const { state } = list;
  const model = state.kind === 'ready' ? rideListModel(state.data, now) : null;
  const showAdd = !(model?.empty ?? false);

  return (
    <>
      {showAdd ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="plus"
            accessibilityLabel={t('ride.list.add')}
            onPress={actions.onAdd}
          />
        </Stack.Toolbar>
      ) : null}
      {model?.empty && state.kind === 'ready' && !state.stale ? (
        <RideEmpty onAdd={actions.onAdd} refreshing={list.pulling} onRefresh={list.pull} />
      ) : (
        <ScrollView
          style={styles.screen}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={list.pulling} onRefresh={list.pull} />}
          testID="ride-screen"
        >
          {state.kind === 'loading' ? <RideLoading /> : null}
          {state.kind === 'failed' ? <RideFailed busy={state.busy} onRetry={list.reload} /> : null}
          {state.kind === 'ready' && state.stale ? (
            <RideStale loadedAt={state.loadedAt} busy={state.busy} onRetry={list.reload} />
          ) : null}
          {model && state.kind === 'ready' ? (
            <ListBody
              model={model}
              now={now}
              actions={actions}
              more={state.data.next !== null ? state.page : null}
              onMore={list.more}
            />
          ) : null}
        </ScrollView>
      )}
    </>
  );
}

function ListBody({
  model,
  now,
  actions,
  more,
  onMore,
}: {
  model: ReturnType<typeof rideListModel>;
  now: number;
  actions: Actions;
  more: 'idle' | 'loading' | 'failed' | null;
  onMore: () => void;
}) {
  const { t, language } = useI18n();
  return (
    <>
      {model.mine.length > 0 || model.historyCount > 0 ? (
        <View style={styles.section}>
          <SectionHeading
            title={t('ride.list.mine')}
            count={model.mine.length}
            testID="ride-list-mine"
          />
          {model.mine.map((ride) => (
            <TicketLink
              key={ride.id}
              ride={ride}
              mine={ride}
              now={now}
              showDay
              onOpen={actions.onOpen}
            />
          ))}
          {model.historyCount > 0 ? (
            <HistoryRow count={model.historyCount} onPress={actions.onHistory} />
          ) : null}
        </View>
      ) : null}
      {model.days.length === 0 ? (
        <View style={styles.section}>
          <SectionHeading title={t('ride.list.joinable')} testID="ride-list-joinable" />
          <InlineState
            text={t('ride.list.joinableEmpty')}
            action={{
              label: t('ride.empty.action'),
              onPress: actions.onAdd,
              testID: 'ride-list-add',
            }}
            testID="ride-list-joinable-empty"
          />
        </View>
      ) : (
        model.days.map((group, index) => (
          <View key={group.day} style={styles.section}>
            <SectionHeading
              title={dayText(group.day, now, t, language)}
              sub={index === 0 ? t('ride.list.joinable') : undefined}
              testID={`ride-list-day-${index}`}
            />
            {group.rides.map((ride) => (
              <TicketLink
                key={ride.id}
                ride={ride}
                now={now}
                showDay={false}
                onOpen={actions.onOpen}
              />
            ))}
          </View>
        ))
      )}
      {more === 'idle' || more === 'loading' || more === 'failed' ? (
        <InlineState
          text={more === 'failed' ? t('ride.list.moreFailed') : t('ride.list.more')}
          action={{
            label: more === 'failed' ? t('ride.list.retry') : t('ride.list.more'),
            onPress: onMore,
            testID: 'ride-list-more',
            busy: more === 'loading',
          }}
          testID="ride-list-more-card"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PlatformColor('systemGroupedBackground') },
  content: {
    paddingHorizontal: vars['--space-4'],
    paddingBottom: vars['--space-7'],
    gap: vars['--space-3'],
  },
  section: { gap: vars['--space-3'] },
});
