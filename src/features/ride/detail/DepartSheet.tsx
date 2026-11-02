import { Section, Text, Toggle, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  font,
  foregroundStyle,
  disabled,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import { malaysiaClock } from '../rideClock';
import { displayName } from './Avatars';
import { arrival, departCandidates, departPreticked } from './detailModel';
import { SheetShell } from './SheetShell';
import type { RideDetail, RideMember } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export type DepartRequest = { id: number; ride: RideDetail; now: number; open: boolean };

export function DepartSheet({
  request,
  viewerId,
  onDepart,
  onClose,
}: {
  request: DepartRequest | null;
  viewerId: string;
  onDepart: (boarded: string[]) => void;
  onClose: () => void;
}) {
  return request ? (
    <DepartForm
      key={request.id}
      request={request}
      viewerId={viewerId}
      onDepart={onDepart}
      onClose={onClose}
    />
  ) : (
    <SheetShell
      open={false}
      title=""
      confirm=""
      testID="ride-depart"
      onConfirm={onClose}
      onClose={onClose}
    >
      {null}
    </SheetShell>
  );
}

function DepartForm({
  request,
  viewerId,
  onDepart,
  onClose,
}: {
  request: DepartRequest;
  viewerId: string;
  onDepart: (boarded: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const { ride, now } = request;
  const candidates = departCandidates(ride);
  const [ticked, setTicked] = useState(() => new Set(departPreticked(ride)));
  const left = candidates.filter((member) => !ticked.has(member.id));
  const count = ticked.size + 1;
  const names = left
    .map((member) => displayName(member, viewerId, t))
    .join(t('ride.detail.listJoin'));

  const line = (member: RideMember) => {
    const state = arrival(member, now);
    if (state.kind === 'arrived')
      return t('ride.detail.depart.arrivedAt', { time: malaysiaClock(state.at) });
    if (state.kind === 'late' && state.said !== null) {
      return t('ride.detail.depart.lateLine', {
        at: malaysiaClock(state.said),
        count: state.minutes,
      });
    }
    return t('ride.detail.arrival.waiting');
  };

  return (
    <SheetShell
      open={request.open}
      large
      title={t('ride.detail.depart.title')}
      confirm={t('ride.detail.depart.confirm', { count })}
      testID="ride-depart"
      onConfirm={() => onDepart([...ticked])}
      onClose={onClose}
    >
      <Section
        footer={
          left.length > 0 ? (
            <Text
              modifiers={[
                foregroundStyle(color('--color-warning')),
                accessibilityIdentifier('ride-depart-consequence'),
              ]}
            >
              {t('ride.detail.depart.consequence', { names })}
            </Text>
          ) : undefined
        }
      >
        <Toggle isOn modifiers={[disabled(true), accessibilityIdentifier('ride-depart-self')]}>
          <VStack alignment="leading">
            <Text>{t('ride.detail.depart.you')}</Text>
            {ride.arrivedAt ? (
              <Text modifiers={[secondary, font({ textStyle: 'footnote' })]}>
                {t('ride.detail.depart.arrivedAt', {
                  time: malaysiaClock(Date.parse(ride.arrivedAt)),
                })}
              </Text>
            ) : null}
          </VStack>
        </Toggle>
        {candidates.map((member) => (
          <Toggle
            key={member.id}
            isOn={ticked.has(member.id)}
            onIsOnChange={(on) =>
              setTicked((current) => {
                const next = new Set(current);
                if (on) next.add(member.id);
                else next.delete(member.id);
                return next;
              })
            }
            modifiers={[accessibilityIdentifier(`ride-depart-${member.id}`)]}
          >
            <VStack alignment="leading">
              <Text>{displayName(member, viewerId, t)}</Text>
              <Text modifiers={[secondary, font({ textStyle: 'footnote' })]}>{line(member)}</Text>
            </VStack>
          </Toggle>
        ))}
      </Section>
    </SheetShell>
  );
}
