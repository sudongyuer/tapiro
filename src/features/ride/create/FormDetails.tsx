import {
  Button,
  DatePicker,
  HStack,
  Image,
  Section,
  Spacer,
  Stepper,
  Text,
} from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  foregroundStyle,
  labelsHidden,
  lineLimit,
  monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { fullRow, ROW_INSETS } from '@/ui/FieldRow';
import { SyncedTextField, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { malaysiaPicker } from '../malaysiaPicker';
import { malaysiaClock, malaysiaDayKey, malaysiaTime } from '../rideClock';
import { BAGS_MAX, type RideDraft } from './draft';
import { codePoints, NOTE_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const NOTE_COUNT_FROM = NOTE_MAX - 20;
const DEFAULT_FLIGHT = '09:00';

type Edit = (patch: Partial<RideDraft>) => void;

function AddRow({
  label,
  value,
  testID,
  onPress,
}: {
  label: string;
  value?: string;
  testID: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <Button
      onPress={onPress}
      testID={testID}
      modifiers={[accessibilityLabel(label), fullRow, ROW_INSETS]}
    >
      <HStack spacing={vars['--space-3']} modifiers={[fullRow]}>
        <Image
          systemName="plus.circle.fill"
          modifiers={[foregroundStyle(color('--color-accent')), accessibilityHidden()]}
        />
        <Text>{label}</Text>
        <Spacer />
        {value ? <Text modifiers={[secondary, lineLimit(1)]}>{value}</Text> : null}
      </HStack>
    </Button>
  );
}

function clockDate(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number);
  return new Date(malaysiaTime(malaysiaDayKey(Date.now()), hours, minutes));
}

function AirportRows({ draft, onEdit }: { draft: RideDraft; onEdit: Edit }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <>
      <HStack modifiers={[fullRow]}>
        <Image systemName="airplane" modifiers={[accessibilityHidden()]} />
        <Text>{t('ride.create.form.airport')}</Text>
        <Spacer />
        <Button
          onPress={() => onEdit({ airportOpen: false, flightClock: null, largeBags: 0 })}
          testID="ride-form-airport-remove"
          modifiers={[buttonStyle('borderless')]}
        >
          <Text modifiers={[foregroundStyle(color('--color-urgent'))]}>
            {t('ride.create.form.remove')}
          </Text>
        </Button>
      </HStack>
      {draft.flightClock ? (
        <HStack modifiers={[fullRow]}>
          <Text>{t('ride.create.form.flight')}</Text>
          <Spacer />
          <DatePicker
            selection={clockDate(draft.flightClock)}
            displayedComponents={['hourAndMinute']}
            onDateChange={(date) => onEdit({ flightClock: malaysiaClock(date.getTime()) })}
            testID="ride-form-flight"
            modifiers={[
              labelsHidden(),
              malaysiaPicker,
              accessibilityLabel(t('ride.create.form.flight')),
            ]}
          />
        </HStack>
      ) : (
        <AddRow
          label={t('ride.create.form.flightAdd')}
          testID="ride-form-flight-add"
          onPress={() => onEdit({ flightClock: DEFAULT_FLIGHT })}
        />
      )}
      <HStack spacing={vars['--space-3']} modifiers={[fullRow]}>
        <Text>{t('ride.create.form.bags')}</Text>
        <Spacer />
        <Text modifiers={[monospacedDigit(), accessibilityIdentifier('ride-form-bags-value')]}>
          {t('ride.create.form.bagsValue', { count: draft.largeBags })}
        </Text>
        <Stepper
          label={t('ride.create.form.bags')}
          value={draft.largeBags}
          min={0}
          max={BAGS_MAX}
          step={1}
          onValueChange={(value) => onEdit({ largeBags: value })}
          testID="ride-form-bags"
          modifiers={[labelsHidden()]}
        />
      </HStack>
    </>
  );
}

export function DetailsSection({
  draft,
  note,
  onEdit,
  onBlur,
}: {
  draft: RideDraft;
  note: SyncedText;
  onEdit: Edit;
  onBlur: (focused: boolean) => void;
}) {
  const { t } = useI18n();
  const count = codePoints(draft.note);
  return (
    <Section header={<Text>{t('ride.create.form.details')}</Text>}>
      {draft.airportOpen ? (
        <AirportRows draft={draft} onEdit={onEdit} />
      ) : (
        <AddRow
          label={t('ride.create.form.airport')}
          testID="ride-form-airport-add"
          onPress={() => onEdit({ airportOpen: true })}
        />
      )}
      {draft.noteOpen ? (
        <>
          <SyncedTextField
            field={note}
            axis="vertical"
            maxLength={NOTE_MAX}
            autoFocus={draft.note === ''}
            placeholder={t('ride.create.form.notePlaceholder')}
            onFocusChange={onBlur}
            testID="ride-form-note"
            modifiers={[accessibilityLabel(t('ride.create.form.note'))]}
          />
          {count >= NOTE_COUNT_FROM ? (
            <Text modifiers={[secondary, monospacedDigit()]}>
              {t('ride.create.form.count', { count, max: NOTE_MAX })}
            </Text>
          ) : null}
        </>
      ) : (
        <AddRow
          label={t('ride.create.form.note')}
          value={t('ride.create.form.optional')}
          testID="ride-form-note-add"
          onPress={() => onEdit({ noteOpen: true })}
        />
      )}
    </Section>
  );
}
