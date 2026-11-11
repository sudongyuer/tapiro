import * as Haptics from 'expo-haptics';
import { Stack, useNavigation } from 'expo-router';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetFrame } from '@/ui/SheetFrame';
import { deviceDecimal } from '@/lib/deviceDecimal';

import { askThenSync } from '../reminders/useRideReminders';
import { recentRoutes, rideDraftStore, rideService } from '../services';
import { useNow } from '../useNow';
import { FeeSection, SummarySection } from './ConfirmParts';
import { draftTicketView } from './draftTicket';
import { canPublish, createPublishFlow, rideGate, type PublishState } from './publishFlow';
import { TicketFrame } from './TicketFrame';
import { rideFormError, useRideDraft } from './useRideDraft';

type ConfirmProps = {
  userId: string;
  onPublished: () => void;
  onAddPayee: () => void;
  onBack: () => void;
  buyCoins?: (onCredited: () => void) => ReactNode;
};

export function RideConfirm({ userId, onPublished, onAddPayee, onBack, buyCoins }: ConfirmProps) {
  const { t, language } = useI18n();
  const navigation = useNavigation();
  const now = useNow();
  const current = useRideDraft(userId);
  const [draft, setDraft] = useState(current);
  if (current !== draft && current.start !== null) setDraft(current);
  const [flow] = useState(() =>
    createPublishFlow({
      service: rideService,
      draft: () => rideDraftStore.load(userId),
      clearDraft: () => rideDraftStore.reset(userId),
      now: () => new Date(),
      decimal: deviceDecimal(),
    }),
  );
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  useEffect(() => {
    void flow.load();
  }, [flow]);
  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: !state.busy });
  }, [navigation, state.busy]);

  const publish = () =>
    flow.publish({
      onPublished: () => {
        const { start, dest, seats } = draft;
        if (start && dest) {
          recentRoutes.add(userId, { start, dest, seats, at: new Date().toISOString() });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPublished();
        void askThenSync(t, language);
      },
      onInvalid: (error) => {
        rideFormError.set(error);
        onBack();
      },
      onAlreadySent: onPublished,
    });

  const notice =
    state.rejected === 'failed' ? (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t('ride.create.confirm.failed')}
        testID="ride-confirm-failed"
      />
    ) : state.rejected === 'invalid' ? (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t('ride.create.confirm.invalid')}
        action={{
          label: t('ride.create.confirm.invalidAction'),
          onPress: onBack,
          testID: 'ride-confirm-invalid-back',
        }}
        testID="ride-confirm-invalid"
      />
    ) : null;

  return (
    <TicketFrame
      view={draftTicketView(draft, now, t, language, deviceDecimal())}
      caption={false}
      testID="ride-confirm"
    >
      <Stack.Screen options={{ headerBackVisible: !state.busy, gestureEnabled: !state.busy }} />
      <SheetFrame notice={notice} testID="ride-confirm">
        <Actions state={state} onPublish={publish} onAddPayee={onAddPayee} />
        <SummarySection draft={draft} now={now} />
        <FeeSection state={state.status} onRetry={flow.load} buyCoins={buyCoins} />
      </SheetFrame>
    </TicketFrame>
  );
}

function Actions({
  state,
  onPublish,
  onAddPayee,
}: {
  state: PublishState;
  onPublish: () => void;
  onAddPayee: () => void;
}) {
  const { t } = useI18n();
  const ready = state.status.kind === 'ready' ? state.status.status : null;
  if (ready && rideGate(ready) === 'noPayee') {
    return (
      <SheetActions>
        <PillButton
          label={t('ride.create.confirm.addPayee')}
          onPress={onAddPayee}
          testID="ride-confirm-add-payee"
        />
      </SheetActions>
    );
  }
  const coin = ready !== null && ready.freePostsLeft === 0;
  return (
    <SheetActions>
      <PillButton
        label={coin ? t('ride.create.confirm.publishCoin') : t('ride.create.confirm.publish')}
        loading={state.busy}
        disabled={!state.busy && !canPublish(state)}
        onPress={onPublish}
        testID="ride-confirm-publish"
      />
    </SheetActions>
  );
}
