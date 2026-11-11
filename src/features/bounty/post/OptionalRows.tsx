import { Button, DatePicker, HStack, Image, Picker, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  pickerStyle,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import type { BountyCategory } from '@/lib/stickers/category';
import { SyncedTextField, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { fullRow, ROW_INSETS } from '@/ui/FieldRow';
import { useRowGlow } from './fillGlow';
import { TimePicks } from './TimePicks';
import { addedTime, moveStart, switchKind, timeBounds } from './timeChoice';
import type { PostDraft, TimeChoice } from './types';
import { codePoints, DESCRIPTION_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const DATE_PARTS: ('date' | 'hourAndMinute')[] = ['date', 'hourAndMinute'];
const DESCRIPTION_COUNT_FROM = 450;

type Edit = (patch: Partial<PostDraft>) => void;

export function AddRow({
  label,
  value,
  voiceOver,
  testID,
  onPress,
  modifiers = [],
}: {
  label: string;
  value?: string;
  voiceOver: string;
  testID: string;
  onPress: () => void;
  modifiers?: ModifierConfig[];
}) {
  const { color } = useTheme();
  return (
    <Button
      onPress={onPress}
      testID={testID}
      modifiers={[
        accessibilityLabel(label),
        ...(value ? [accessibilityValue(value)] : []),
        accessibilityHint(voiceOver),
        fullRow,
        ROW_INSETS,
        ...modifiers,
      ]}
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

export function HeadingRow({
  label,
  remove,
  modifiers = [],
}: {
  label: string;
  remove: { voiceOver: string; testID: string; onPress: () => void } | null;
  modifiers?: ModifierConfig[];
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <HStack spacing={0} modifiers={[fullRow, ROW_INSETS, ...modifiers]}>
      <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>{label}</Text>
      <Spacer />
      {remove ? (
        <Button
          role="destructive"
          onPress={afterResign(remove.onPress)}
          testID={remove.testID}
          modifiers={[buttonStyle('borderless'), accessibilityLabel(remove.voiceOver)]}
        >
          <Text
            modifiers={[
              foregroundStyle(color('--color-urgent')),
              frame({
                minWidth: vars['--touch-min'],
                minHeight: vars['--touch-min'],
                alignment: 'trailing',
              }),
              contentShape(shapes.rectangle()),
            ]}
          >
            {t('bounty.post.form.remove')}
          </Text>
        </Button>
      ) : null}
    </HStack>
  );
}

export function TimeRows({
  time,
  category,
  label,
  onEdit,
}: {
  time: TimeChoice;
  category: BountyCategory | null;
  label: string;
  onEdit: Edit;
}) {
  const { t } = useI18n();
  const glow = useRowGlow('time');
  if (time.kind === 'none') {
    return (
      <AddRow
        modifiers={glow}
        label={label}
        value={t('bounty.post.form.noTime')}
        voiceOver={t('bounty.post.form.addTimeLabel')}
        testID="bounty-post-add-time"
        onPress={() => onEdit({ time: addedTime(new Date()) })}
      />
    );
  }
  const range = timeBounds(new Date());
  return (
    <>
      <HeadingRow
        modifiers={glow}
        label={label}
        remove={{
          voiceOver: t('bounty.post.form.removeTimeLabel'),
          testID: 'bounty-post-remove-time',
          onPress: () => onEdit({ time: { kind: 'none' } }),
        }}
      />
      <TimePicks time={time} category={category} onEdit={onEdit} />
      <Picker
        label={t('bounty.post.form.timeKind')}
        selection={time.kind}
        onSelectionChange={(kind: string) => {
          if (kind === 'deadline' || kind === 'window') {
            onEdit({ time: switchKind(time, kind, new Date()) });
          }
        }}
        testID="bounty-post-time-kind"
        modifiers={[pickerStyle('segmented'), ROW_INSETS, ...glow]}
      >
        <Text modifiers={[tag('deadline')]}>{t('bounty.post.form.deadline')}</Text>
        <Text modifiers={[tag('window')]}>{t('bounty.post.form.window')}</Text>
      </Picker>
      {time.kind === 'deadline' ? (
        <DatePicker
          title={t('bounty.post.form.deadline')}
          selection={new Date(time.deadlineAt)}
          range={range}
          displayedComponents={DATE_PARTS}
          onDateChange={(date) =>
            onEdit({ time: { kind: 'deadline', deadlineAt: date.toISOString() } })
          }
          testID="bounty-post-deadline"
          modifiers={glow}
        />
      ) : (
        <>
          <DatePicker
            title={t('bounty.post.form.start')}
            selection={new Date(time.startsAt)}
            range={range}
            displayedComponents={DATE_PARTS}
            onDateChange={(date) => onEdit({ time: moveStart(time, date) })}
            testID="bounty-post-start"
            modifiers={glow}
          />
          <DatePicker
            title={t('bounty.post.form.end')}
            selection={new Date(time.endsAt)}
            range={{ start: new Date(time.startsAt), end: range.end }}
            displayedComponents={DATE_PARTS}
            onDateChange={(date) => onEdit({ time: { ...time, endsAt: date.toISOString() } })}
            testID="bounty-post-end"
            modifiers={glow}
          />
        </>
      )}
    </>
  );
}

export function DescriptionRows({
  description,
  field,
  placeholder,
  onBlur,
  onEdit,
}: {
  description: string | null;
  field: SyncedText;
  placeholder: string;
  onBlur: (focused: boolean) => void;
  onEdit: Edit;
}) {
  const { t } = useI18n();
  const glow = useRowGlow('description');
  const [justAdded, setJustAdded] = useState(false);
  if (description === null) {
    return (
      <AddRow
        modifiers={glow}
        label={t('bounty.post.form.addDescription')}
        voiceOver={t('bounty.post.form.addDescriptionLabel')}
        testID="bounty-post-add-description"
        onPress={() => {
          setJustAdded(true);
          field.set('');
          onEdit({ description: '' });
        }}
      />
    );
  }
  const count = codePoints(description);
  return (
    <>
      <HeadingRow
        modifiers={glow}
        label={t('bounty.post.form.description')}
        remove={
          description.trim() === ''
            ? {
                voiceOver: t('bounty.post.form.removeDescriptionLabel'),
                testID: 'bounty-post-remove-description',
                onPress: () => onEdit({ description: null }),
              }
            : null
        }
      />
      <SyncedTextField
        field={field}
        axis="vertical"
        autoFocus={justAdded}
        maxLength={DESCRIPTION_MAX}
        placeholder={placeholder}
        onFocusChange={onBlur}
        testID="bounty-post-description"
        modifiers={[
          lineLimit({ min: 3, max: 8 }),
          accessibilityLabel(t('bounty.post.form.description')),
          ROW_INSETS,
          ...glow,
        ]}
      />
      {count >= DESCRIPTION_COUNT_FROM ? (
        <HStack spacing={0} modifiers={[ROW_INSETS, accessibilityElement('combine')]}>
          <Spacer />
          <Text
            modifiers={[
              secondary,
              monospacedDigit(),
              accessibilityLabel(t('bounty.post.form.countLabel', { count, max: DESCRIPTION_MAX })),
              accessibilityIdentifier('bounty-post-description-count'),
            ]}
          >
            {t('bounty.post.form.count', { count, max: DESCRIPTION_MAX })}
          </Text>
        </HStack>
      ) : null}
    </>
  );
}
