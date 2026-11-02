import { DatePicker, Section, Text, Toggle } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  datePickerStyle,
  lineLimit,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';

import { NOTE_MAX, PLATE_MAX, type DetailsDraft } from './drafts';
import { SheetShell } from './SheetShell';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const length = (text: string) => [...text].length;

export function ApplyNoteSheet({
  open,
  name,
  initial,
  onDraft,
  onSend,
  onClose,
}: {
  open: boolean;
  name: string;
  initial: string;
  onDraft: (text: string) => void;
  onSend: (note: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [typed, setTyped] = useState(initial);
  const note = useSyncedText(initial, (text) => {
    onDraft(text);
    setTyped(text);
  });
  return (
    <SheetShell
      open={open}
      title={t('ride.detail.apply.title')}
      confirm={t('ride.detail.apply.send')}
      confirmDisabled={length(typed.trim()) > NOTE_MAX}
      testID="ride-apply"
      onConfirm={() => onSend(note.sync())}
      onClose={onClose}
    >
      <Section
        title={t('ride.detail.apply.noteLabel', { name })}
        footer={<Text>{t('ride.detail.apply.footer', { name })}</Text>}
      >
        <SyncedTextField
          field={note}
          axis="vertical"
          maxLength={NOTE_MAX}
          placeholder={t('ride.detail.apply.placeholder')}
          testID="ride-apply-note"
          modifiers={[
            lineLimit({ min: 3, max: 6 }),
            accessibilityLabel(t('ride.detail.apply.noteLabel', { name })),
          ]}
        />
        <Text modifiers={[accessibilityIdentifier('ride-apply-count')]}>
          {t('ride.create.form.count', { count: length(typed), max: NOTE_MAX })}
        </Text>
      </Section>
    </SheetShell>
  );
}

export type TimeRequest = {
  id: number;
  current: number;
  first: number;
  now: number;
  open: boolean;
};

export function TimeSheet({
  request,
  onSave,
  onClose,
}: {
  request: TimeRequest | null;
  onSave: (at: Date) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const start = request ? Math.max(request.current + MINUTE, request.now + MINUTE) : 0;
  const [picked, setPicked] = useState<Date | null>(null);
  const shown = picked ?? new Date(start);
  return (
    <SheetShell
      open={request?.open ?? false}
      title={t('ride.detail.time.title')}
      confirm={t('ride.detail.time.save')}
      testID="ride-time"
      onConfirm={() => {
        onSave(shown);
        setPicked(null);
      }}
      onClose={() => {
        setPicked(null);
        onClose();
      }}
    >
      {request ? (
        <Section footer={<Text>{t('ride.detail.time.footer')}</Text>}>
          <DatePicker
            title={t('ride.detail.time.picker')}
            selection={shown}
            displayedComponents={['date', 'hourAndMinute']}
            range={{ start: new Date(start), end: new Date(request.first + DAY) }}
            onDateChange={setPicked}
            modifiers={[datePickerStyle('compact'), accessibilityIdentifier('ride-time-picker')]}
          />
        </Section>
      ) : null}
    </SheetShell>
  );
}

export function DetailsSheet({
  open,
  initial,
  now,
  onDraft,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: DetailsDraft;
  now: number;
  onDraft: (draft: DetailsDraft) => void;
  onSave: (draft: DetailsDraft) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const edit = (patch: Partial<DetailsDraft>) =>
    setDraft((current) => {
      const next = { ...current, ...patch };
      onDraft(next);
      return next;
    });
  const plate = useSyncedText(initial.plate, (text) => edit({ plate: text }));
  const note = useSyncedText(initial.meetingNote, (text) => edit({ meetingNote: text }));
  const eta = draft.eta ?? new Date(now + 45 * MINUTE).toISOString();
  return (
    <SheetShell
      open={open}
      large
      title={t('ride.detail.details.title')}
      confirm={t('ride.detail.details.save')}
      testID="ride-details"
      onConfirm={() => onSave({ ...draft, plate: plate.sync(), meetingNote: note.sync() })}
      onClose={onClose}
    >
      <Section
        title={t('ride.detail.details.plate')}
        footer={<Text>{t('ride.detail.details.plateFooter')}</Text>}
      >
        <SyncedTextField
          field={plate}
          maxLength={PLATE_MAX}
          placeholder={t('ride.detail.details.platePlaceholder')}
          testID="ride-details-plate"
          modifiers={[accessibilityLabel(t('ride.detail.details.plate'))]}
        />
      </Section>
      <Section>
        <Toggle
          isOn={draft.eta !== null}
          label={t('ride.detail.details.eta')}
          onIsOnChange={(on) => edit({ eta: on ? eta : null })}
          modifiers={[accessibilityIdentifier('ride-details-eta-toggle')]}
        />
        {draft.eta !== null ? (
          <DatePicker
            title={t('ride.detail.details.etaPicker')}
            selection={new Date(draft.eta)}
            displayedComponents={['hourAndMinute']}
            range={{ start: new Date(now - 60 * MINUTE), end: new Date(now + 2 * DAY - MINUTE) }}
            onDateChange={(date) => edit({ eta: date.toISOString() })}
            modifiers={[datePickerStyle('compact'), accessibilityIdentifier('ride-details-eta')]}
          />
        ) : null}
      </Section>
      <Section title={t('ride.detail.details.note')}>
        <SyncedTextField
          field={note}
          axis="vertical"
          maxLength={NOTE_MAX}
          placeholder={t('ride.create.form.notePlaceholder')}
          testID="ride-details-note"
          modifiers={[
            lineLimit({ min: 2, max: 5 }),
            accessibilityLabel(t('ride.detail.details.note')),
          ]}
        />
      </Section>
    </SheetShell>
  );
}
