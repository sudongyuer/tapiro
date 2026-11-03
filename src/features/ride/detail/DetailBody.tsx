import { useState } from 'react';
import { Linking, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';

import { malaysiaClock } from '../rideClock';
import { ApplicationCard } from './ApplicationCard';
import { displayName } from './Avatars';
import { MeetupTiles, NoteCard, PrivacyLine, PromptCard, SplitRow } from './DetailCards';
import {
  appealsToConfirm,
  appealView,
  askGoOrCancel,
  detailPhase,
  emptySeats,
  timeline,
} from './detailModel';
import type { ActionState } from './detailState';
import { FullTicket } from './FullTicket';
import { fullTicketView } from './fullTicketView';
import { GRAB_HOME_URL, walkingDirectionsUrl } from './links';
import { OweCard, StickerCard } from './SettleCards';
import { ArriveStep, SettleStep } from './SettleSteps';
import { Timeline } from './Timeline';
import type { RideDetail } from './types';
import type { DetailActions } from './useDetailActions';
import type { SettleActions } from './useSettleActions';

type Props = {
  ride: RideDetail;
  viewerId: string;
  now: number;
  staleAt: number | null;
  action: ActionState;
  actions: DetailActions;
  onTicketLayout: (event: LayoutChangeEvent) => void;
  onEditDetails: () => void;
  settle: SettleActions;
  onChangeShare: (member: string) => void;
  onReceipt: () => void;
};

export function DetailBody({
  ride,
  viewerId,
  now,
  staleAt,
  action,
  actions,
  onTicketLayout,
  onEditDetails,
  settle,
  onChangeShare,
  onReceipt,
}: Props) {
  const { t, language } = useI18n();
  const [opened, setOpened] = useState<'maps' | 'grab' | null>(null);
  const [goDismissed, setGoDismissed] = useState(false);
  const phase = detailPhase(ride, now);
  const open = phase === 'before' || phase === 'meetup';
  const organiser = ride.role === 'organiser';
  const inside = organiser || ride.role === 'member';
  const busyTarget = action.kind === 'busy' ? action.target : null;
  const busy = action.kind === 'busy' ? action.action : null;

  const openUrl = async (url: string, kind: 'maps' | 'grab') => {
    setOpened(null);
    try {
      await Linking.openURL(url);
    } catch {
      setOpened(kind);
    }
  };

  const stepStrong = (key: 'arrive' | 'settle') =>
    timeline(ride, now).find((step) => step.key === key)?.state !== 'future';
  const appeal = appealView(ride, now);
  const toConfirm = appealsToConfirm(ride, viewerId, now);

  return (
    <View style={styles.body}>
      <FullTicket
        view={fullTicketView(ride, now, t, language, viewerId)}
        onLayout={onTicketLayout}
      />
      <OweCard ride={ride} viewerId={viewerId} now={now} />
      <StickerCard
        ride={ride}
        viewerId={viewerId}
        busy={busy === 'collect'}
        onCollect={() => void settle.collect()}
        onOpenBook={settle.openStickerBook}
      />
      {organiser && open && ride.requests ? (
        <ApplicationCard
          requests={ride.requests}
          busy={busy === 'decide' ? busyTarget : busy ? '' : null}
          full={ride.taken >= ride.seats}
          onDecide={actions.decide}
        />
      ) : null}
      {inside && phase === 'meetup' ? (
        <MeetupTiles
          organiser={organiser}
          plate={ride.details?.plate ?? null}
          failed={opened}
          onNavigate={() => void openUrl(walkingDirectionsUrl(ride.startPoint), 'maps')}
          onGrab={() => void openUrl(GRAB_HOME_URL, 'grab')}
          onPlate={onEditDetails}
        />
      ) : null}
      {askGoOrCancel(ride, now) && !goDismissed ? (
        <PromptCard
          tone="warning"
          title={t('ride.detail.goOrCancel.title', { count: emptySeats(ride) })}
          body={t('ride.detail.goOrCancel.body')}
          actions={[
            {
              label: t('ride.detail.goOrCancel.go'),
              onPress: () => setGoDismissed(true),
              testID: 'ride-detail-go',
            },
            {
              label: t('ride.detail.goOrCancel.cancel'),
              variant: 'secondary',
              loading: busy === 'cancel',
              onPress: () => void actions.cancel(),
              testID: 'ride-detail-go-cancel',
            },
          ]}
          testID="ride-detail-go-or-cancel"
        />
      ) : null}
      {appeal.kind === 'canAppeal' ? (
        <PromptCard
          tone="warning"
          title={t('ride.detail.appeal.canTitle')}
          body={t('ride.detail.appeal.canBody', { time: malaysiaClock(appeal.until) })}
          actions={[
            {
              label: t('ride.detail.appeal.action'),
              loading: busy === 'appeal',
              onPress: actions.appeal,
              testID: 'ride-detail-appeal',
            },
          ]}
          testID="ride-detail-appeal-card"
        />
      ) : null}
      {appeal.kind === 'pending' ? (
        <PromptCard
          title={t('ride.detail.appeal.pendingTitle')}
          body={t('ride.detail.appeal.pendingBody', { time: malaysiaClock(appeal.until) })}
          actions={[]}
          testID="ride-detail-appeal-pending"
        />
      ) : null}
      {appeal.kind === 'lapsed' || appeal.kind === 'closed' ? (
        <PromptCard
          title={t(
            appeal.kind === 'lapsed'
              ? 'ride.detail.appeal.lapsedTitle'
              : 'ride.detail.appeal.closedTitle',
          )}
          body={t(
            appeal.outcome === 'waived'
              ? appeal.kind === 'lapsed'
                ? 'ride.detail.appeal.lapsedWaived'
                : 'ride.detail.appeal.closedWaived'
              : appeal.kind === 'lapsed'
                ? 'ride.detail.appeal.lapsedCounted'
                : 'ride.detail.appeal.closedCounted',
          )}
          actions={[]}
          testID={
            appeal.kind === 'lapsed' ? 'ride-detail-appeal-lapsed' : 'ride-detail-appeal-closed'
          }
        />
      ) : null}
      {toConfirm.map((member) => (
        <PromptCard
          key={member.id}
          tone="warning"
          title={t('ride.detail.appeal.confirmTitle', { name: displayName(member, viewerId, t) })}
          body={t('ride.detail.appeal.confirmBody')}
          actions={[
            {
              label: t('ride.detail.appeal.confirm'),
              loading: busy === 'confirmAppeal' && busyTarget === member.id,
              onPress: () => actions.confirmAppeal(member.id),
              testID: `ride-detail-confirm-appeal-${member.id}`,
            },
          ]}
          testID={`ride-detail-appeal-${member.id}`}
        />
      ))}
      {phase === 'cancelled' || phase === 'expired' ? (
        <AppText
          variant="secondary"
          tone="secondaryLabel"
          style={styles.ended}
          testID="ride-detail-ended"
        >
          {t(phase === 'cancelled' ? 'ride.detail.ended.cancelled' : 'ride.detail.ended.expired')}
        </AppText>
      ) : null}
      <Timeline
        ride={ride}
        viewerId={viewerId}
        now={now}
        staleAt={staleAt}
        bodies={{
          arrive: <ArriveStep ride={ride} strong={stepStrong('arrive')} />,
          settle: (
            <SettleStep
              ride={ride}
              viewerId={viewerId}
              now={now}
              strong={stepStrong('settle')}
              busy={busy ? { action: busy, target: busyTarget } : null}
              actions={{
                confirm: (paymentId) => void settle.confirmReceived(paymentId),
                notReceived: settle.notReceived,
                change: onChangeShare,
                openPayment: settle.openPayment,
              }}
              onReceipt={onReceipt}
            />
          ),
        }}
      />
      {inside && ride.details?.meetingNote ? (
        <NoteCard
          note={ride.details.meetingNote}
          onEdit={organiser && open ? onEditDetails : null}
        />
      ) : null}
      {organiser && open ? (
        <SplitRow mode={ride.splitMode} busy={busy !== null} onChange={actions.setSplitMode} />
      ) : null}
      {!inside && open ? <PrivacyLine /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: vars['--space-3'] },
  ended: { textAlign: 'center' },
});
