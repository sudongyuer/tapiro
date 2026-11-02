import {
  HStack,
  Picker,
  Section,
  Spacer,
  Stepper,
  Text,
  VStack,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  keyboardType,
  labelsHidden,
  monospacedDigit,
  multilineTextAlignment,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useRef } from 'react';

import { useI18n } from '@/lib/i18n';
import { CURRENCIES, formatMoney } from '@/lib/money';
import { FieldRow } from '@/ui/FieldRow';
import { SyncedTextField, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';

import type { SplitMode } from '../types';
import { SEATS, type RideDraft } from './draft';
import { draftPerPerson } from './draftTicket';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const ESTIMATE_DIGITS = 7;

export function SeatsSection({
  seats,
  onEdit,
}: {
  seats: number;
  onEdit: (patch: Partial<RideDraft>) => void;
}) {
  const { t } = useI18n();
  const need = seats - 1;
  return (
    <Section>
      <HStack spacing={vars['--space-3']}>
        <VStack
          alignment="leading"
          spacing={vars['--space-1'] / 2}
          modifiers={[
            accessibilityElement('combine'),
            accessibilityIdentifier('ride-form-seats-label'),
          ]}
        >
          <Text>{t('ride.create.form.seats')}</Text>
          <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>
            {seats === SEATS.max
              ? t('ride.create.form.sixSeats', { count: need })
              : t('ride.create.form.need', { count: need })}
          </Text>
        </VStack>
        <Spacer />
        <Text
          modifiers={[
            font({ textStyle: 'title2', weight: 'bold', design: 'rounded' }),
            monospacedDigit(),
            accessibilityIdentifier('ride-form-seats-value'),
          ]}
        >
          {String(seats)}
        </Text>
        <Stepper
          label={t('ride.create.form.seats')}
          value={seats}
          min={SEATS.min}
          max={SEATS.max}
          step={1}
          onValueChange={(value) => onEdit({ seats: value })}
          testID="ride-form-seats"
          modifiers={[labelsHidden()]}
        />
      </HStack>
    </Section>
  );
}

export function FareSection({
  draft,
  field,
  onEdit,
  onBlur,
}: {
  draft: RideDraft;
  field: SyncedText;
  onEdit: (patch: Partial<RideDraft>) => void;
  onBlur: (focused: boolean) => void;
}) {
  const { t, language } = useI18n();
  const input = useRef<TextFieldRef>(null);
  const each = draftPerPerson(draft);
  const footer = each
    ? t('ride.create.form.fareFooter', {
        count: draft.seats,
        amount: formatMoney(each, language, { whole: true }),
      })
    : t('ride.create.form.fareFooterEmpty');
  return (
    <Section
      header={<Text>{t('ride.create.form.fare')}</Text>}
      footer={<Text modifiers={[accessibilityIdentifier('ride-form-fare-footer')]}>{footer}</Text>}
    >
      <FieldRow field={input}>
        <Text>{t('ride.create.form.estimate')}</Text>
        <Spacer />
        <Text modifiers={[secondary]}>{CURRENCIES[draft.currency].symbol}</Text>
        <SyncedTextField
          ref={input}
          field={field}
          maxLength={ESTIMATE_DIGITS}
          placeholder={t('ride.create.form.estimatePlaceholder')}
          onFocusChange={onBlur}
          testID="ride-form-estimate"
          modifiers={[
            keyboardType('decimal-pad'),
            multilineTextAlignment('trailing'),
            font({ size: vars['--text-amount-compact'], weight: 'heavy', design: 'rounded' }),
            accessibilityLabel(t('ride.create.form.estimate')),
          ]}
        />
      </FieldRow>
      <Picker
        label={t('ride.create.form.split')}
        selection={draft.splitMode}
        onSelectionChange={(next: SplitMode) => onEdit({ splitMode: next })}
        testID="ride-form-split"
        modifiers={[pickerStyle('menu')]}
      >
        <Text modifiers={[tag('tapiro')]}>{t('ride.create.form.splitTapiro')}</Text>
        <Text modifiers={[tag('grab')]}>{t('ride.create.form.splitGrab')}</Text>
      </Picker>
    </Section>
  );
}
