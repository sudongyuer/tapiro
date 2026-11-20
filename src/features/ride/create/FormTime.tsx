import { Button, HStack, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  lineLimit,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { ChipRow, DateTimeRow } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { localClock, localDayKey } from '@/lib/deviceClock';

import { whenText } from '../ticketView';
import type { RideDraft } from './draft';
import { customStart, gatherTime, quickPicks } from './timePicks';
import { DEPART_AHEAD_MS } from './validate';

// A regular bordered button adds 7 pt above and below its label (measured 34 pt around a 20 pt label).
const CHIP_LABEL_HEIGHT = vars['--touch-min'] - 14;

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
  const { color } = useTheme();
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
      <HStack
        spacing={0}
        modifiers={[frame({ maxWidth: Infinity, minHeight: vars['--touch-min'] })]}
      >
        <Text>{t('ride.create.form.depart')}</Text>
        <Spacer />
        {chosen ? (
          <DateTimeRow
            title={t('ride.create.form.depart')}
            labelHidden
            selection={new Date(chosen)}
            range={{ start: new Date(now), end: new Date(now + DEPART_AHEAD_MS) }}
            onDateChange={(date) => set(date.getTime())}
            testID="ride-form-time"
          />
        ) : null}
      </HStack>
      <ChipRow spacing={vars['--space-2']}>
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
                frame({ maxWidth: Infinity, maxHeight: Infinity }),
                accessibilityLabel(t('ride.create.form.pickLabel', { time: label })),
                ...(on ? [accessibilityAddTraits(['isSelected'])] : []),
              ]}
            >
              <Text
                modifiers={[
                  lineLimit(2),
                  multilineTextAlignment('center'),
                  frame({ maxWidth: Infinity, minHeight: CHIP_LABEL_HEIGHT, maxHeight: Infinity }),
                  ...(on ? [foregroundStyle(color('--color-on-accent'))] : []),
                ]}
              >
                {label}
              </Text>
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
              frame({ maxWidth: Infinity, maxHeight: Infinity }),
            ]}
          >
            <Text
              modifiers={[
                lineLimit(2),
                multilineTextAlignment('center'),
                frame({ maxWidth: Infinity, minHeight: CHIP_LABEL_HEIGHT, maxHeight: Infinity }),
              ]}
            >
              {t('ride.create.form.pickTime')}
            </Text>
          </Button>
        ) : null}
      </ChipRow>
    </Section>
  );
}
