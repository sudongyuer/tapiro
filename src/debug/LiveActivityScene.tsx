import type { TFunction } from 'i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LiveActivity } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import {
  dismissAfterSeconds,
  liveActivityContent,
  liveActivityLink,
  type LiveActivitySubject,
} from '@/lib/live-activity';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';

const MINUTE = 60_000;

const FIXTURES = [
  'bountyOnTheWay',
  'bountyArrived',
  'rideMeetupHome',
  'rideMeetupPlace',
  'rideDeparted',
  'stale',
] as const;
type Fixture = (typeof FIXTURES)[number];

function subjectFor(fixture: Fixture, t: TFunction, now: number): LiveActivitySubject {
  const bounty = {
    kind: 'bounty' as const,
    id: 'debug-bounty',
    helper: t('debug.liveActivity.helper'),
    place: t('debug.liveActivity.place'),
  };
  const ride = {
    kind: 'ride' as const,
    id: 'debug-ride',
    start: { name: t('debug.liveActivity.start'), home: fixture === 'rideMeetupHome' },
  };
  switch (fixture) {
    case 'bountyOnTheWay':
    case 'stale':
      return {
        ...bounty,
        phase: 'onTheWay',
        task: t('debug.liveActivity.task'),
        leftAt: now - 6 * MINUTE,
        etaAt: fixture === 'stale' ? now - 4 * MINUTE : now + 6 * MINUTE,
      };
    case 'bountyArrived':
      return { ...bounty, phase: 'arrived', leftAt: now - 12 * MINUTE, arrivedAt: now };
    case 'rideMeetupHome':
    case 'rideMeetupPlace':
      return {
        ...ride,
        phase: 'meetup',
        gatherAt: now - 17 * MINUTE,
        departAt: now + 11 * MINUTE,
        arrived: 2,
        total: 4,
      };
    case 'rideDeparted':
      return {
        ...ride,
        phase: 'departed',
        gatherAt: now - 30 * MINUTE,
        departedAt: now,
        aboard: 3,
      };
  }
}

const FINAL: Partial<Record<Fixture, 'arrived' | 'departed'>> = {
  bountyArrived: 'arrived',
  rideDeparted: 'departed',
};

async function startFixture(fixture: Fixture, t: TFunction) {
  const now = Date.now();
  const subject = subjectFor(fixture, t, now);
  const state = liveActivityContent(subject, t, now);
  const result = await LiveActivity.start(subject.kind, liveActivityLink(subject), state);
  const final = FINAL[fixture];
  if (result.status !== 'ok' || !final) return { result, ended: null };
  return { result, ended: await LiveActivity.end(result.id, state, dismissAfterSeconds(final)) };
}

export function LiveActivityScene({ onReady }: { onReady: () => void }) {
  const { t } = useI18n();
  const [lines, setLines] = useState<string[]>([]);
  const id = useRef<string | null>(null);

  const log = useCallback((line: string) => {
    console.log(`[live-activity] ${line}`);
    setLines((prev) => [line, ...prev].slice(0, 20));
  }, []);

  useEffect(() => onReady(), [onReady]);

  const endNow = async () => {
    if (!id.current) return;
    log(`end ${JSON.stringify(await LiveActivity.end(id.current, null, 0))}`);
    id.current = null;
  };

  const show = async (fixture: Fixture) => {
    await endNow();
    const { result, ended } = await startFixture(fixture, t);
    log(`start ${fixture} ${JSON.stringify(result)}`);
    if (result.status === 'ok') id.current = result.id;
    if (ended) log(`end ${JSON.stringify(ended)}`);
  };

  const list = async () => log(`list ${JSON.stringify(await LiveActivity.list())}`);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.buttons}>
        {FIXTURES.map((fixture) => (
          <PillButton
            key={fixture}
            label={t(`debug.liveActivity.${fixture}`)}
            onPress={() => show(fixture)}
          />
        ))}
        <PillButton label={t('debug.liveActivity.endNow')} onPress={endNow} variant="secondary" />
        <PillButton label={t('debug.liveActivity.list')} onPress={list} variant="secondary" />
      </View>
      {lines.map((line, index) => (
        <AppText key={`${index}-${line}`} variant="meta" selectable>
          {line}
        </AppText>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: vars['--space-4'], gap: vars['--space-2'] },
  buttons: { gap: vars['--space-2'] },
});
