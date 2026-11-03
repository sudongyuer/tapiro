import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { localClock } from '@/lib/deviceClock';

import { ArrivalRow, displayName, SeatRow } from './Avatars';
import {
  activeMembers,
  arrival,
  arrivedCount,
  detailPhase,
  emptySeats,
  latestJoined,
  timeline,
  type StepKey,
  type TimelineStep,
} from './detailModel';
import type { RideDetail } from './types';

const TIME_WIDTH = 64;
const DOT = 11;

type Props = { ride: RideDetail; viewerId: string; now: number; staleAt: number | null };

export function Timeline({
  ride,
  viewerId,
  now,
  staleAt,
  bodies = {},
}: Props & { bodies?: Partial<Record<StepKey, ReactNode>> }) {
  const steps = timeline(ride, now);
  return (
    <View style={styles.card} testID="ride-detail-timeline">
      {steps.map((step, index) => (
        <Step key={step.key} step={step} last={index === steps.length - 1}>
          {bodies[step.key] ?? (
            <StepBody step={step.key} ride={ride} viewerId={viewerId} now={now} staleAt={staleAt} />
          )}
        </Step>
      ))}
    </View>
  );
}

function Step({
  step,
  last,
  children,
}: {
  step: TimelineStep;
  last: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const ink = color('--color-accent');
  const time =
    step.state === 'now'
      ? t('ride.detail.steps.now')
      : step.at === null
        ? ''
        : step.estimate
          ? t('ride.detail.steps.about', { time: localClock(step.at) })
          : localClock(step.at);
  const past = step.state === 'past';
  return (
    <View style={styles.step} testID={`ride-detail-step-${step.key}`}>
      <AppText
        variant="meta"
        numberOfLines={1}
        tone={step.state === 'now' ? 'label' : 'secondaryLabel'}
        style={[styles.time, step.state === 'now' && styles.bold]}
      >
        {time}
      </AppText>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            past
              ? { backgroundColor: ink, borderColor: ink }
              : step.state === 'now'
                ? { borderColor: ink, borderWidth: 3 }
                : { borderColor: PlatformColor('tertiaryLabel') },
          ]}
        />
        {last ? null : (
          <View
            style={[styles.line, { backgroundColor: past ? ink : PlatformColor('separator') }]}
          />
        )}
      </View>
      <View style={[styles.body, last && styles.lastBody]}>{children}</View>
    </View>
  );
}

export function Title({
  text,
  strong,
  testID,
}: {
  text: string;
  strong: boolean;
  testID?: string;
}) {
  return (
    <AppText
      variant="body"
      tone={strong ? 'label' : 'secondaryLabel'}
      style={strong && styles.bold}
      testID={testID}
    >
      {text}
    </AppText>
  );
}

export function Sub({ text, testID }: { text: string; testID?: string }) {
  return (
    <AppText variant="meta" tone="secondaryLabel" testID={testID}>
      {text}
    </AppText>
  );
}

function StepBody({ step, ride, viewerId, now, staleAt }: Props & { step: StepKey }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const phase = detailPhase(ride, now);
  const before = phase === 'before';
  const inside = ride.members !== null;
  const unknown = t('bounty.post.unknownName');
  const organiser = ride.organiser ? displayName(ride.organiser, viewerId, t) : unknown;
  const tier = ride.organiser ? t(`bounty.tier.${ride.organiser.tier}`) : '';
  const strong = (key: StepKey) =>
    timeline(ride, now).find((s) => s.key === key)?.state !== 'future';

  switch (step) {
    case 'published':
      return before ? (
        <>
          <Title text={t('ride.detail.steps.published')} strong />
          <Sub
            text={t('ride.detail.steps.by', { name: organiser, tier })}
            testID="ride-detail-organiser"
          />
        </>
      ) : (
        <Title text={t('ride.detail.steps.publishedBy', { name: organiser })} strong />
      );
    case 'full': {
      const need = emptySeats(ride);
      const joined = inside ? latestJoined(ride, viewerId) : null;
      return before ? (
        <>
          <Title
            text={
              need > 0
                ? t('ride.detail.steps.need', { count: need })
                : t('ride.detail.steps.fullCount', { taken: ride.taken, seats: ride.seats })
            }
            strong
          />
          <SeatRow ride={ride} viewerId={viewerId} />
          {joined?.joinedAt ? (
            <Sub
              text={t('ride.detail.steps.joined', {
                name: displayName(joined, viewerId, t),
                tier: t(`bounty.tier.${joined.tier}`),
                time: localClock(Date.parse(joined.joinedAt)),
              })}
            />
          ) : null}
        </>
      ) : (
        <Title
          text={t('ride.detail.steps.fullCount', { taken: ride.taken, seats: ride.seats })}
          strong={strong('full')}
        />
      );
    }
    case 'meetup': {
      const meetup = phase === 'meetup' && inside;
      const late = meetup
        ? activeMembers(ride).flatMap((m) => {
            const state = arrival(m, now);
            return state.kind === 'late' && state.said !== null ? [{ m, state }] : [];
          })
        : [];
      return (
        <>
          <Title
            text={
              meetup
                ? t('ride.detail.steps.meetupArrived', {
                    arrived: arrivedCount(ride),
                    total: activeMembers(ride).length,
                  })
                : t('ride.detail.steps.meetup')
            }
            strong={strong('meetup')}
            testID="ride-detail-meetup-title"
          />
          <Sub text={ride.start.label} />
          {meetup ? <ArrivalRow ride={ride} viewerId={viewerId} now={now} /> : null}
          {late.map(({ m, state }) => (
            <AppText
              key={m.id}
              variant="meta"
              style={[styles.bold, { color: color('--color-warning') }]}
              testID={`ride-detail-late-${m.id}`}
            >
              {t('ride.detail.arrival.lateLine', {
                name: displayName(m, viewerId, t),
                at: localClock(state.said ?? now),
                count: state.minutes,
                until: localClock(state.until),
              })}
            </AppText>
          ))}
          {meetup && staleAt !== null ? (
            <AppText
              variant="meta"
              style={{ color: color('--color-warning') }}
              testID="ride-detail-live-stale"
            >
              {t('ride.detail.staleLive', { time: localClock(staleAt) })}
            </AppText>
          ) : null}
        </>
      );
    }
    case 'board': {
      const boarded = (ride.members ?? []).filter((m) => m.status === 'boarded');
      const departed = ride.departedAt !== null;
      return (
        <>
          <Title
            text={
              departed
                ? t('ride.detail.steps.boardCount', { count: ride.taken })
                : t('ride.detail.steps.board')
            }
            strong={strong('board')}
          />
          {departed && boarded.length > 0 ? (
            <Sub
              text={boarded.map((m) => displayName(m, viewerId, t)).join(t('ride.detail.listJoin'))}
            />
          ) : null}
        </>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    paddingVertical: vars['--space-4'],
    paddingRight: vars['--space-4'],
  },
  step: { flexDirection: 'row' },
  time: { width: TIME_WIDTH, textAlign: 'right', paddingTop: 2 },
  bold: { fontWeight: '700' },
  rail: { width: vars['--space-6'], alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    marginTop: 5,
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  line: { flex: 1, width: 2, marginVertical: 2 },
  body: { flex: 1, minWidth: 0, gap: vars['--space-1'], paddingBottom: vars['--space-3'] },
  lastBody: { paddingBottom: 0 },
});
