import {
  Button,
  DatePicker,
  HStack,
  Picker,
  Spacer,
  Text,
  TextField,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import { fullRow, ROW_INSETS } from './FieldRow';
import { addedTime, moveStart, switchKind, timeBounds } from './timeChoice';
import type { PostDraft, TimeChoice } from './types';
import { codePoints, DESCRIPTION_MAX } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const DATE_PARTS: ('date' | 'hourAndMinute')[] = ['date', 'hourAndMinute'];

type Edit = (patch: Partial<PostDraft>) => void;

export function AddRow({
  label,
  voiceOver,
  testID,
  onPress,
}: {
  label: string;
  voiceOver: string;
  testID: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <Button
      label={label}
      systemImage="plus"
      onPress={onPress}
      testID={testID}
      modifiers={[
        foregroundStyle(color('--color-accent')),
        accessibilityLabel(voiceOver),
        fullRow,
        ROW_INSETS,
      ]}
    />
  );
}

export function RemoveRow({
  label,
  voiceOver,
  testID,
  onPress,
}: {
  label?: string;
  voiceOver: string;
  testID: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Button
      label={label ?? t('bounty.post.form.remove')}
      role="destructive"
      onPress={onPress}
      testID={testID}
      modifiers={[
        foregroundStyle(color('--color-urgent')),
        accessibilityLabel(voiceOver),
        fullRow,
        ROW_INSETS,
      ]}
    />
  );
}

export function TimeRows({ time, onEdit }: { time: TimeChoice; onEdit: Edit }) {
  const { t } = useI18n();
  if (time.kind === 'none') {
    return (
      <AddRow
        label={t('bounty.post.form.addTime')}
        voiceOver={t('bounty.post.form.addTimeLabel')}
        testID="bounty-post-add-time"
        onPress={() => onEdit({ time: addedTime(new Date()) })}
      />
    );
  }
  const range = timeBounds(new Date());
  return (
    <>
      <Picker
        label={t('bounty.post.form.timeKind')}
        selection={time.kind}
        onSelectionChange={(kind: string) => {
          if (kind === 'deadline' || kind === 'window') {
            onEdit({ time: switchKind(time, kind, new Date()) });
          }
        }}
        testID="bounty-post-time-kind"
        modifiers={[pickerStyle('segmented'), ROW_INSETS]}
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
          />
          <DatePicker
            title={t('bounty.post.form.end')}
            selection={new Date(time.endsAt)}
            range={{ start: new Date(time.startsAt), end: range.end }}
            displayedComponents={DATE_PARTS}
            onDateChange={(date) => onEdit({ time: { ...time, endsAt: date.toISOString() } })}
            testID="bounty-post-end"
          />
        </>
      )}
      <RemoveRow
        voiceOver={t('bounty.post.form.removeTimeLabel')}
        testID="bounty-post-remove-time"
        onPress={() => onEdit({ time: { kind: 'none' } })}
      />
    </>
  );
}

type NativeText = ReturnType<typeof useNativeState<string>>;

export function DescriptionRows({
  description,
  text,
  onBlur,
  onEdit,
}: {
  description: string | null;
  text: NativeText;
  onBlur: (focused: boolean) => void;
  onEdit: Edit;
}) {
  const { t } = useI18n();
  const [justAdded, setJustAdded] = useState(false);
  if (description === null) {
    return (
      <AddRow
        label={t('bounty.post.form.addDescription')}
        voiceOver={t('bounty.post.form.addDescriptionLabel')}
        testID="bounty-post-add-description"
        onPress={() => {
          setJustAdded(true);
          text.set('');
          onEdit({ description: '' });
        }}
      />
    );
  }
  return (
    <DescriptionField
      description={description}
      text={text}
      focus={justAdded}
      onBlur={onBlur}
      onEdit={onEdit}
    />
  );
}

function DescriptionField({
  description,
  text,
  focus,
  onBlur,
  onEdit,
}: {
  description: string;
  text: NativeText;
  focus: boolean;
  onBlur: (focused: boolean) => void;
  onEdit: Edit;
}) {
  const { t } = useI18n();
  const count = codePoints(description);
  return (
    <>
      <TextField
        text={text}
        axis="vertical"
        autoFocus={focus}
        maxLength={DESCRIPTION_MAX}
        placeholder={t('bounty.post.form.descriptionPlaceholder')}
        onTextChange={(next) => onEdit({ description: next })}
        onFocusChange={onBlur}
        testID="bounty-post-description"
        modifiers={[
          lineLimit({ min: 3, max: 8 }),
          accessibilityLabel(t('bounty.post.form.description')),
          ROW_INSETS,
        ]}
      />
      <HStack modifiers={[ROW_INSETS]}>
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
      {description.trim() === '' ? (
        <RemoveRow
          voiceOver={t('bounty.post.form.removeDescriptionLabel')}
          testID="bounty-post-remove-description"
          onPress={() => onEdit({ description: null })}
        />
      ) : null}
    </>
  );
}
