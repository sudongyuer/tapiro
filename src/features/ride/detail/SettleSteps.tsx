import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { AppText } from '@/ui/AppText';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';

import { ticketModel } from '../ticket';
import { displayName } from './Avatars';
import { paidCount } from './settleModel';
import { OrganiserRows, RiderRows, type RowBusy, type SettleRowActions } from './SettleRows';
import { Sub, Title } from './Timeline';
import type { RideDetail } from './types';

const ICON = 17;

export function ArriveStep({ ride, strong }: { ride: RideDetail; strong: boolean }) {
  const { t } = useI18n();
  const organiser = ride.role === 'organiser';
  const name = ride.organiser?.name ?? t('bounty.post.unknownName');
  if (ride.status === 'arrived')
    return (
      <Title
        text={
          organiser ? t('rideSettle.steps.waitTotal') : t('rideSettle.steps.waitSplit', { name })
        }
        strong
        testID="ride-detail-arrive-title"
      />
    );
  if (ride.reachedAt)
    return (
      <Title
        text={t('rideSettle.steps.arrived', { place: ride.dest.short })}
        strong
        testID="ride-detail-arrive-title"
      />
    );
  if (ride.status === 'departed' && organiser)
    return (
      <>
        <Title text={t('rideSettle.steps.ask')} strong testID="ride-detail-arrive-title" />
        <Sub text={t('rideSettle.steps.askBody')} />
      </>
    );
  return <Title text={t('ride.detail.steps.arrive')} strong={strong} />;
}

function settleTitle(ride: RideDetail, t: ReturnType<typeof useI18n>['t']) {
  const count = paidCount(ride);
  if (ride.status === 'closed') return t('rideSettle.steps.settleDone', { total: count.total });
  if (ride.role !== 'organiser')
    return t('rideSettle.steps.settlePaid', { paid: count.paid, total: count.total });
  return count.waiting > 0
    ? t('rideSettle.steps.settleConfirm', { count: count.waiting })
    : t('rideSettle.steps.settleCount', { received: count.received, total: count.total });
}

export function SettleStep({
  ride,
  viewerId,
  now,
  strong,
  busy,
  actions,
  onReceipt,
}: {
  ride: RideDetail;
  viewerId: string;
  now: number;
  strong: boolean;
  busy: RowBusy;
  actions: SettleRowActions;
  onReceipt: () => void;
}) {
  const { t, language } = useI18n();
  const name = ride.organiser
    ? displayName(ride.organiser, viewerId, t)
    : t('bounty.post.unknownName');
  if (ride.splitMode === 'grab' && ride.status === 'closed')
    return (
      <>
        <Title text={t('rideSettle.steps.settleGrab')} strong testID="ride-detail-settle-title" />
        <Sub text={t('rideSettle.steps.settleGrabBody')} />
      </>
    );
  if (!ride.settle) {
    const model = ticketModel(ride, now);
    const each = model.perPerson ? formatMoney(model.perPerson, language, { whole: true }) : null;
    return (
      <>
        <Title text={t('ride.detail.steps.settle')} strong={strong} />
        <Sub
          text={
            ride.splitMode === 'grab'
              ? t('ride.create.form.splitGrab')
              : each
                ? t('ride.detail.steps.settleTapiro', { amount: each })
                : t('ride.detail.steps.settleTapiroOnly')
          }
          testID="ride-detail-settle-line"
        />
      </>
    );
  }
  return (
    <>
      <Title text={settleTitle(ride, t)} strong testID="ride-detail-settle-title" />
      {ride.settle.receipt ? (
        <PressDim
          style={styles.receipt}
          onPress={onReceipt}
          accessibilityRole="button"
          accessibilityLabel={`${t('rideSettle.receipt.title')}，${t('rideSettle.receipt.open')}`}
          testID="ride-settle-receipt"
        >
          <SymbolView name="doc.text.image" size={ICON} tintColor={PlatformColor('label')} />
          <View style={styles.flex}>
            <AppText variant="secondary" style={styles.bold} numberOfLines={1}>
              {`${formatMoney(ride.settle.total, language)} · ${t('rideSettle.receipt.title')}`}
            </AppText>
            <AppText variant="meta" tone="secondaryLabel" numberOfLines={2}>
              {`${t('rideSettle.receipt.body', { name })} · ${t('rideSettle.receipt.open')}`}
            </AppText>
          </View>
        </PressDim>
      ) : null}
      {ride.role === 'organiser' ? (
        <OrganiserRows ride={ride} viewerId={viewerId} now={now} busy={busy} actions={actions} />
      ) : (
        <RiderRows ride={ride} viewerId={viewerId} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--touch-min'],
    marginTop: vars['--space-1'],
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-2'],
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('tertiarySystemFill'),
  },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
});
