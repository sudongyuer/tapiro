import { Form, Host } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatMoneyRange } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { useSyncedText } from '@/ui/SyncedTextField';
import { useTheme } from '@/ui/theme/useTheme';
import { deviceDecimal } from '@/lib/deviceDecimal';

import { rideDraftStore } from '../services';
import { useNow } from '../useNow';
import type { RideDraft } from './draft';
import { draftTicketView } from './draftTicket';
import { FormPlaces } from './FormPlaces';
import { DetailsSection } from './FormDetails';
import { FareSection, SeatsSection } from './FormFare';
import { FormTime } from './FormTime';
import { TicketFrame } from './TicketFrame';
import {
  editDraft,
  rideFormError,
  useRideDraft,
  useRideFormError,
  usePickedPlaces,
  useShortNames,
} from './useRideDraft';
import { checkRideDraft, estimateLimits } from './validate';

type FormProps = {
  userId: string;
  onNext: () => void;
  onPickPlace: (which: 'start' | 'dest') => void;
};

export function RideForm({ userId, onNext, onPickPlace }: FormProps) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const draft = useRideDraft(userId);
  const notice = useRideFormError();
  const now = useNow();
  usePickedPlaces(userId, useShortNames());
  useEffect(() => () => rideFormError.set(null), []);

  const edit = (patch: Partial<RideDraft>) => editDraft(userId, patch);
  const estimate = useSyncedText(draft.estimateText, (text) => edit({ estimateText: text }));
  const note = useSyncedText(draft.note, (text) => edit({ note: text }));
  const sync = () => {
    estimate.sync();
    note.sync();
  };
  const onBlur = (focused: boolean) => {
    if (!focused) sync();
  };

  function next() {
    sync();
    const checked = checkRideDraft(rideDraftStore.load(userId), new Date(), deviceDecimal());
    if (!checked.ok) return rideFormError.set(checked.error);
    rideFormError.set(null);
    onNext();
  }

  const limits = estimateLimits(draft.currency);
  const noticeText =
    notice === 'estimateRange'
      ? t('ride.create.error.estimateRange', {
          range: formatMoneyRange(
            { minor: limits.minMinor, currency: draft.currency },
            { minor: limits.maxMinor, currency: draft.currency },
            language,
          ),
        })
      : notice === 'alreadySent'
        ? null
        : notice
          ? t(`ride.create.error.${notice}`)
          : null;

  return (
    <TicketFrame
      view={draftTicketView(draft, now, t, language, deviceDecimal())}
      testID="ride-form"
    >
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="prominent"
          tintColor={color('--color-accent')}
          onPress={next}
        >
          {t('ride.create.next')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Host style={styles.host} testID="ride-form">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {noticeText ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={noticeText}
              testID="ride-form-notice"
            />
          ) : null}
          <FormPlaces
            draft={draft}
            onPick={(which) => {
              sync();
              onPickPlace(which);
            }}
            onEdit={edit}
          />
          <FormTime draft={draft} now={now} onEdit={edit} />
          <SeatsSection seats={draft.seats} onEdit={edit} />
          <FareSection draft={draft} field={estimate} onEdit={edit} onBlur={onBlur} />
          <DetailsSection draft={draft} note={note} onEdit={edit} onBlur={onBlur} />
        </Form>
      </Host>
    </TicketFrame>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
