import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { PAYEE_TYPES } from '@/lib/payeeMethods';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { malaysiaClock } from '../rideClock';
import { displayName } from './Avatars';
import { owedDays } from './settleModel';
import type { RideDetail, SettleRider } from './types';

const ICON = 15;

export type SettleRowActions = {
  confirm: (paymentId: string) => void;
  notReceived: (paymentId: string) => void;
  change: (member: string) => void;
  openPayment: (paymentId: string) => void;
};

export type RowBusy = { action: string; target: string | null } | null;

function methodName(type: string | null, t: ReturnType<typeof useI18n>['t']) {
  const known = PAYEE_TYPES.find((candidate) => candidate === type);
  if (!known) return '';
  return known === 'duitnow_qr' ? t('payee.types.duitnow_qr_generic') : t(`payee.types.${known}`);
}

function Tick() {
  const { color } = useTheme();
  return (
    <SymbolView name="checkmark.circle.fill" size={ICON} tintColor={color('--color-success')} />
  );
}

export function OrganiserRows({
  ride,
  viewerId,
  now,
  busy,
  actions,
}: {
  ride: RideDetail;
  viewerId: string;
  now: number;
  busy: RowBusy;
  actions: SettleRowActions;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const locked = busy !== null;
  return (
    <View style={styles.rows}>
      {(ride.settle?.riders ?? []).map((rider) => {
        const name = displayName(rider, viewerId, t);
        const days = owedDays(rider, now);
        const sub =
          rider.paid === 'settled'
            ? t('rideSettle.rows.received', {
                time: rider.settledAt ? malaysiaClock(Date.parse(rider.settledAt)) : '',
              })
            : rider.paid === 'paid'
              ? `${t('rideSettle.rows.saidPaid', {
                  method: methodName(rider.methodType, t),
                  time: rider.markedPaidAt ? malaysiaClock(Date.parse(rider.markedPaidAt)) : '',
                })}${rider.hasProof ? t('rideSettle.rows.proof') : ''}`
              : days > 0
                ? t('rideSettle.rows.dueDays', { count: days })
                : t('rideSettle.rows.due');
        const target = (action: string) => busy?.action === action && busy.target === rider.id;
        return (
          <View key={rider.id} style={styles.row} testID={`ride-settle-row-${rider.id}`}>
            <View style={styles.line}>
              <AppText variant="body" style={[styles.flex, styles.bold]} numberOfLines={2}>
                {t('rideSettle.rows.share', { name, amount: formatMoney(rider.share, language) })}
              </AppText>
              {rider.paid === 'settled' ? <Tick /> : null}
            </View>
            <AppText variant="meta" tone="secondaryLabel" testID={`ride-settle-sub-${rider.id}`}>
              {sub}
            </AppText>
            {rider.dispute ? (
              <AppText
                variant="meta"
                style={[styles.bold, { color: color('--color-warning') }]}
                testID={`ride-settle-dispute-${rider.id}`}
              >
                {rider.dispute.note
                  ? t('rideSettle.rows.disputed', { note: rider.dispute.note })
                  : t('rideSettle.rows.disputedNoNote')}
              </AppText>
            ) : null}
            {rider.paymentId && rider.paid !== 'settled' ? (
              <RowActions
                rider={rider}
                locked={locked}
                busy={target}
                actions={actions}
                paymentId={rider.paymentId}
              />
            ) : null}
          </View>
        );
      })}
      {(ride.settle?.riders ?? []).some((rider) => rider.paid === 'due') ? (
        <AppText variant="meta" tone="secondaryLabel" testID="ride-settle-reminder">
          {t('rideSettle.rows.reminder')}
        </AppText>
      ) : null}
    </View>
  );
}

function RowActions({
  rider,
  paymentId,
  locked,
  busy,
  actions,
}: {
  rider: SettleRider;
  paymentId: string;
  locked: boolean;
  busy: (action: string) => boolean;
  actions: SettleRowActions;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.actions}>
      {rider.hasProof ? (
        <PillButton
          label={t('rideSettle.rows.viewProof')}
          variant="secondary"
          disabled={locked}
          onPress={() => actions.openPayment(paymentId)}
          testID={`ride-settle-proof-${rider.id}`}
        />
      ) : null}
      {rider.paid === 'due' && rider.dispute ? (
        <PillButton
          label={t('rideSettle.rows.change')}
          variant="secondary"
          disabled={locked}
          onPress={() => actions.change(rider.id)}
          testID={`ride-settle-change-${rider.id}`}
        />
      ) : null}
      {rider.paid === 'paid' ? (
        <>
          <PillButton
            label={t('rideSettle.rows.notReceived')}
            variant="secondary"
            disabled={locked}
            loading={busy('notReceived')}
            onPress={() => actions.notReceived(paymentId)}
            testID={`ride-settle-not-received-${rider.id}`}
          />
          <PillButton
            label={t('rideSettle.rows.confirm')}
            disabled={locked}
            loading={busy('confirmReceived')}
            onPress={() => actions.confirm(paymentId)}
            testID={`ride-settle-confirm-${rider.id}`}
          />
        </>
      ) : null}
    </View>
  );
}

export function RiderRows({ ride, viewerId }: { ride: RideDetail; viewerId: string }) {
  const { t, language } = useI18n();
  const organiser = ride.organiser;
  return (
    <View style={styles.rows}>
      {organiser ? (
        <View style={styles.row} testID="ride-settle-row-organiser">
          <AppText variant="body" style={styles.bold} numberOfLines={2}>
            {displayName(organiser, viewerId, t)}
          </AppText>
          <AppText variant="meta" tone="secondaryLabel">
            {t('rideSettle.rows.organiser', {
              amount: ride.settle?.organiserShare
                ? formatMoney(ride.settle.organiserShare, language)
                : '',
            })}
          </AppText>
        </View>
      ) : null}
      {(ride.settle?.riders ?? []).map((rider) => {
        const name = displayName(rider, viewerId, t);
        const state = t(`rideSettle.paid.${rider.paid}`);
        return (
          <View
            key={rider.id}
            style={[styles.row, styles.line]}
            accessible
            accessibilityLabel={t('rideSettle.rows.a11y', { name, state })}
            testID={`ride-settle-row-${rider.id}`}
          >
            <AppText variant="body" style={[styles.flex, styles.bold]} numberOfLines={2}>
              {name}
            </AppText>
            {rider.paid === 'due' ? null : <Tick />}
            <AppText
              variant="secondary"
              tone={rider.paid === 'due' ? 'secondaryLabel' : 'label'}
              testID={`ride-settle-paid-${rider.id}`}
            >
              {state}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: vars['--space-3'], marginTop: vars['--space-2'] },
  row: { gap: vars['--space-1'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
});
