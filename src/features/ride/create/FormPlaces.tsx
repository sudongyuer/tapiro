import { Button, HStack, Image, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { SHORT_NAME_MAX } from '@/features/place';
import { useI18n } from '@/lib/i18n';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { DraftPlace, RideDraft } from './draft';
import { codePoints } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const row = frame({ maxWidth: Infinity, minHeight: vars['--touch-min'], alignment: 'leading' });

type Which = 'start' | 'dest';

export function FormPlaces({
  draft,
  onPick,
  onEdit,
}: {
  draft: RideDraft;
  onPick: (which: Which) => void;
  onEdit: (patch: Partial<RideDraft>) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Which | null>(null);
  const destPlaceholder = draft.tile
    ? t(`ride.create.pick.tile.${draft.tile}.dest`)
    : t('ride.create.form.dest');
  return (
    <Section>
      {(['start', 'dest'] as const).map((which) => (
        <PlaceRows
          key={`${which}-${draft[which]?.label ?? ''}`}
          which={which}
          place={draft[which]}
          placeholder={which === 'start' ? t('ride.create.form.start') : destPlaceholder}
          editing={editing === which}
          onPick={() => onPick(which)}
          onToggleEdit={() => setEditing(editing === which ? null : which)}
          onShort={(short) => {
            const place = draft[which];
            if (place) onEdit({ [which]: { ...place, short, shortEdited: true } });
          }}
        />
      ))}
    </Section>
  );
}

function PlaceRows({
  which,
  place,
  placeholder,
  editing,
  onPick,
  onToggleEdit,
  onShort,
}: {
  which: Which;
  place: DraftPlace | null;
  placeholder: string;
  editing: boolean;
  onPick: () => void;
  onToggleEdit: () => void;
  onShort: (short: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const short = useSyncedText(place?.short ?? '', onShort);
  const subline = place
    ? t(place.shortEdited ? 'ride.create.form.shortEdited' : 'ride.create.form.shortAuto', {
        short: place.short,
      })
    : null;
  return (
    <>
      <HStack spacing={vars['--space-3']} modifiers={[row]}>
        <Image
          systemName={which === 'start' ? 'circle' : 'circle.fill'}
          size={12}
          modifiers={[accessibilityHidden()]}
        />
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Button
            onPress={onPick}
            testID={`ride-form-${which}`}
            modifiers={[
              buttonStyle('borderless'),
              accessibilityLabel(place ? `${placeholder}: ${place.label}` : placeholder),
            ]}
          >
            <HStack spacing={0}>
              <Text
                modifiers={[
                  place ? foregroundStyle(color('--color-accent')) : secondary,
                  lineLimit(2),
                ]}
              >
                {place?.label ?? placeholder}
              </Text>
              <Spacer />
              <Image systemName="chevron.right" size={13} modifiers={[secondary]} />
            </HStack>
          </Button>
          {subline ? (
            <HStack spacing={vars['--space-2']}>
              <Text
                modifiers={[
                  font({ textStyle: 'footnote' }),
                  secondary,
                  accessibilityIdentifier(`ride-form-${which}-short`),
                ]}
              >
                {subline}
              </Text>
              <Button
                onPress={onToggleEdit}
                testID={`ride-form-${which}-short-edit`}
                modifiers={[
                  buttonStyle('borderless'),
                  accessibilityLabel(t('ride.create.form.shortEditLabel')),
                ]}
              >
                <Text
                  modifiers={[
                    font({ textStyle: 'footnote' }),
                    frame({ minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] }),
                    contentShape(shapes.rectangle()),
                  ]}
                >
                  {t('ride.create.form.shortEdit')}
                </Text>
              </Button>
            </HStack>
          ) : null}
        </VStack>
      </HStack>
      {editing && place ? (
        <HStack spacing={vars['--space-3']} modifiers={[row]}>
          <Text modifiers={[secondary]}>{t('ride.create.form.shortLabel')}</Text>
          <SyncedTextField
            field={short}
            maxLength={SHORT_NAME_MAX}
            autoFocus
            testID={`ride-form-${which}-short-field`}
          />
          <Text modifiers={[secondary, monospacedDigit()]}>
            {t('ride.create.form.shortCount', {
              count: codePoints(place.short),
              max: SHORT_NAME_MAX,
            })}
          </Text>
        </HStack>
      ) : null}
    </>
  );
}
