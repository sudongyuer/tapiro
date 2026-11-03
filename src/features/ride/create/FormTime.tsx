import { Button, DatePicker, HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  labelsHidden,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { localClock, localDayKey } from '@/lib/deviceClock';

import { whenText } from '../ticketView';
import type { RideDraft } from './draft';
import { customStart, gatherTime, quickPicks } from './timePicks';
import { DEPART_AHEAD_MS } from './validate';

const DATE_PARTS: ('date' | 'hourAndMinute')[] = ['date', 'hourAndMinute'];

export function FormTime({
  draft,
  now,
  onEdit,
}: {
  draft: RideDraft;
  now: number;
  onEdit: (patch: Partial<RideDraft>) => void;
}) {
  const { t, language } = useI18n();
  const chosen = draft.departAt ? Date.parse(draft.departAt) : null;
  const picks = quickPicks(now);
  const set = (time: number) => onEdit({ departAt: new Date(time).toISOString() });
  return (
    <Section
      footer={
        chosen ? (
          <Text modifiers={[accessibilityIdentifier('ride-form-gather')]}>
            {t('ride.create.form.gather', { time: localClock(gatherTime(chosen)) })}
          </Text>
        ) : undefined
      }
    >
      <HStack modifiers={[frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] })]}>
        <Text>{t('ride.create.form.depart')}</Text>
        <Spacer />
        {chosen ? (
          <DatePicker
            selection={new Date(chosen)}
            range={{ start: new Date(now), end: new Date(now + DEPART_AHEAD_MS) }}
            displayedComponents={DATE_PARTS}
            onDateChange={(date) => set(date.getTime())}
            testID="ride-form-time"
            modifiers={[labelsHidden(), accessibilityLabel(t('ride.create.form.depart'))]}
          />
        ) : null}
      </HStack>
      <HStack spacing={vars['--space-2']}>
        {picks.map((time, index) => {
          const label =
            localDayKey(time) === localDayKey(now)
              ? localClock(time)
              : whenText(time, now, t, language);
          const on = chosen === time;
          return (
            <Button
              key={time}
              onPress={() => set(time)}
              testID={`ride-form-pick-${index}`}
              modifiers={[
                buttonStyle(on ? 'borderedProminent' : 'bordered'),
                buttonBorderShape('capsule'),
                controlSize('regular'),
                frame({ maxWidth: Infinity }),
                accessibilityLabel(t('ride.create.form.pickLabel', { time: label })),
                ...(on ? [accessibilityAddTraits(['isSelected'])] : []),
              ]}
            >
              <Text modifiers={[lineLimit(1), frame({ maxWidth: Infinity })]}>{label}</Text>
            </Button>
          );
        })}
        {chosen === null ? (
          <Button
            onPress={() => set(customStart(now))}
            testID="ride-form-pick-custom"
            modifiers={[
              buttonStyle('bordered'),
              buttonBorderShape('capsule'),
              controlSize('regular'),
              frame({ maxWidth: Infinity }),
            ]}
          >
            <Text modifiers={[lineLimit(1), frame({ maxWidth: Infinity })]}>
              {t('ride.create.form.pickTime')}
            </Text>
          </Button>
        ) : null}
      </HStack>
    </Section>
  );
}
