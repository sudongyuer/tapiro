import { HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  foregroundStyle,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { deviceDecimal } from '@/lib/deviceDecimal';

import { malaysiaClock } from '../rideClock';
import { whenText } from '../ticketView';
import type { RideDraft } from './draft';
import { bagsLine, draftPerPerson } from './draftTicket';
import { rideCost, rideGate, type StatusState } from './publishFlow';
import { gatherTime } from './timePicks';
import { parseEstimate } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <HStack modifiers={[accessibilityElement('combine'), accessibilityIdentifier(testID)]}>
      <Text>{label}</Text>
      <Spacer />
      <Text modifiers={[secondary, lineLimit(2)]}>{value}</Text>
    </HStack>
  );
}

export function SummarySection({ draft, now }: { draft: RideDraft; now: number }) {
  const { t, language } = useI18n();
  if (!draft.departAt) return null;
  const departs = Date.parse(draft.departAt);
  const estimate = parseEstimate(draft.estimateText, draft.currency, deviceDecimal());
  const each = draftPerPerson(draft, deviceDecimal());
  const bags = bagsLine(draft, t);
  return (
    <Section>
      <Row
        label={t('ride.create.confirm.depart')}
        value={whenText(departs, now, t, language)}
        testID="ride-confirm-depart"
      />
      <Row
        label={t('ride.create.confirm.gather')}
        value={t('ride.create.confirm.gatherValue', { time: malaysiaClock(gatherTime(departs)) })}
        testID="ride-confirm-gather"
      />
      <Row
        label={t('ride.create.confirm.seats')}
        value={t('ride.create.confirm.seatsValue', { count: draft.seats })}
        testID="ride-confirm-seats"
      />
      {estimate && each ? (
        <Row
          label={t('ride.create.confirm.estimate')}
          value={t('ride.create.confirm.estimateValue', {
            total: formatMoney(estimate, language, { whole: true }),
            each: formatMoney(each, language, { whole: true }),
          })}
          testID="ride-confirm-estimate"
        />
      ) : null}
      <Row
        label={t('ride.create.confirm.split')}
        value={t(
          draft.splitMode === 'grab'
            ? 'ride.create.form.splitGrab'
            : 'ride.create.form.splitTapiro',
        )}
        testID="ride-confirm-split"
      />
      {draft.airportOpen && draft.flightClock ? (
        <Row
          label={t('ride.create.confirm.flight')}
          value={draft.flightClock}
          testID="ride-confirm-flight"
        />
      ) : null}
      {bags ? (
        <Row label={t('ride.create.confirm.bags')} value={bags} testID="ride-confirm-bags" />
      ) : null}
      {draft.noteOpen && draft.note.trim() ? (
        <Row
          label={t('ride.create.confirm.note')}
          value={draft.note.trim()}
          testID="ride-confirm-note"
        />
      ) : null}
    </Section>
  );
}

export function FeeSection({ state, onRetry }: { state: StatusState; onRetry: () => void }) {
  const { t, language } = useI18n();
  if (state.kind === 'loading') {
    return (
      <Section>
        <Row
          label={t('ride.create.confirm.fee')}
          value={t('ride.create.confirm.loading')}
          testID="ride-confirm-fee"
        />
      </Section>
    );
  }
  if (state.kind === 'failed') {
    return (
      <NoticeCard
        tone="urgent"
        icon="wifi.exclamationmark"
        title={t('ride.create.confirm.loadFailed')}
        action={{
          label: t('ride.create.confirm.retry'),
          onPress: onRetry,
          testID: 'ride-confirm-retry',
        }}
        testID="ride-confirm-fee-failed"
      />
    );
  }
  const cost = rideCost(state.status);
  const gate = rideGate(state.status);
  const value =
    cost.kind === 'free'
      ? t('ride.create.confirm.free', { left: cost.left, of: cost.of })
      : t('ride.create.confirm.coin', { balance: cost.kind === 'coin' ? cost.balance : 0 });
  const date = new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' }).format(
    new Date(state.status.nextFreeAt),
  );
  return (
    <>
      {gate === 'noPayee' ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.circle.fill"
          title={t('ride.create.confirm.noPayee')}
          testID="ride-confirm-no-payee"
        />
      ) : null}
      {gate === 'blocked' ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.triangle.fill"
          title={t('ride.create.confirm.blocked')}
          testID="ride-confirm-blocked"
        />
      ) : null}
      {gate === 'noBalance' ? (
        <NoticeCard
          tone="urgent"
          icon="circle.slash"
          title={t('ride.create.confirm.noBalance', { date })}
          testID="ride-confirm-no-balance"
        />
      ) : null}
      <Section
        footer={
          <Text>
            {cost.kind === 'free'
              ? t('ride.create.confirm.refundFree', { of: state.status.freePostsPerMonth })
              : t('ride.create.confirm.refundCoin')}
          </Text>
        }
      >
        <Row label={t('ride.create.confirm.fee')} value={value} testID="ride-confirm-fee" />
      </Section>
    </>
  );
}
