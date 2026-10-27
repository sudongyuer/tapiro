import {
  Button,
  HStack,
  Image,
  Section,
  Spacer,
  Text,
  TextField,
  type TextFieldRef,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';
import { useRef } from 'react';

import { useI18n } from '@/lib/i18n';

import { FieldRow, fullRow, ROW_INSETS } from './FieldRow';
import { AddRow, RemoveRow } from './OptionalRows';
import type { DraftPlace } from './types';
import { ADDRESS_MAX, codePoints, PLACE_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const CHEVRON = 14;

type NativeText = ReturnType<typeof useNativeState<string>>;

export function AddPlaceRow({ onPick }: { onPick: () => void }) {
  const { t } = useI18n();
  return (
    <AddRow
      label={t('bounty.place.add')}
      voiceOver={t('bounty.place.addLabel')}
      testID="bounty-post-add-place"
      onPress={onPick}
    />
  );
}

export function PlaceSections({
  place,
  label,
  address,
  focusLabel,
  onPick,
  onEdit,
  onBlur,
  onRemove,
}: {
  place: DraftPlace;
  label: NativeText;
  address: NativeText;
  focusLabel: boolean;
  onPick: () => void;
  onEdit: (patch: Partial<DraftPlace>) => void;
  onBlur: (focused: boolean) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const labelField = useRef<TextFieldRef>(null);
  const addressField = useRef<TextFieldRef>(null);
  const count = codePoints(place.label);
  return (
    <>
      <Section>
        <Button
          onPress={onPick}
          testID="bounty-post-place"
          modifiers={[
            accessibilityLabel(t('bounty.place.picked', { place: place.label })),
            fullRow,
            ROW_INSETS,
          ]}
        >
          <HStack modifiers={[fullRow, accessibilityElement('combine')]}>
            <Text>{t('bounty.place.row')}</Text>
            <Spacer />
            <Text modifiers={[secondary, lineLimit(1)]}>{place.label}</Text>
            <Image
              systemName="chevron.right"
              size={CHEVRON}
              modifiers={[tertiary, accessibilityHidden()]}
            />
          </HStack>
        </Button>
      </Section>
      <Section
        header={<Text>{t('bounty.place.labelTitle')}</Text>}
        footer={<Text>{t('bounty.place.labelFooter')}</Text>}
      >
        <FieldRow field={labelField}>
          <TextField
            ref={labelField}
            text={label}
            autoFocus={focusLabel}
            maxLength={PLACE_MAX}
            placeholder=""
            onTextChange={(text) => onEdit({ label: text })}
            onFocusChange={onBlur}
            testID="bounty-post-place-label"
            modifiers={[accessibilityLabel(t('bounty.place.labelTitle'))]}
          />
          <Text
            modifiers={[
              secondary,
              monospacedDigit(),
              accessibilityLabel(t('bounty.post.form.countLabel', { count, max: PLACE_MAX })),
              accessibilityIdentifier('bounty-post-place-label-count'),
            ]}
          >
            {t('bounty.post.form.count', { count, max: PLACE_MAX })}
          </Text>
        </FieldRow>
      </Section>
      <Section
        header={<Text>{t('bounty.place.addressTitle')}</Text>}
        footer={<Text>{t('bounty.place.addressFooter')}</Text>}
      >
        <FieldRow field={addressField}>
          <TextField
            ref={addressField}
            text={address}
            maxLength={ADDRESS_MAX}
            placeholder={t('bounty.place.addressPlaceholder')}
            onTextChange={(text) => onEdit({ address: text === '' ? null : text })}
            onFocusChange={onBlur}
            testID="bounty-post-address"
            modifiers={[accessibilityLabel(t('bounty.place.addressTitle'))]}
          />
        </FieldRow>
      </Section>
      <Section>
        <RemoveRow
          label={t('bounty.place.remove')}
          voiceOver={t('bounty.place.remove')}
          testID="bounty-post-remove-place"
          onPress={onRemove}
        />
      </Section>
    </>
  );
}
