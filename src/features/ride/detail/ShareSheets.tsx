import { Section, Spacer, Text, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  foregroundStyle,
  keyboardType,
  lineLimit,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { CURRENCIES, formatMoney } from '@/lib/money';
import { FieldRow } from '@/ui/FieldRow';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';
import { deviceDecimal } from '@/lib/deviceDecimal';

import { parseEstimate } from '../create/validate';
import { NOTE_MAX } from './drafts';
import { SheetShell } from './SheetShell';
import { shareText } from './splitDraft';
import type { RideDetail } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const length = (text: string) => [...text].length;

export function DisputeSheet({
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
      title={t('rideSettle.dispute.title')}
      confirm={t('rideSettle.dispute.send', { name })}
      confirmDisabled={length(typed.trim()) > NOTE_MAX}
      testID="ride-dispute"
      onConfirm={() => onSend(note.sync())}
      onClose={onClose}
    >
      <Section
        title={t('rideSettle.dispute.label', { name })}
        footer={<Text>{t('rideSettle.dispute.footer', { name })}</Text>}
      >
        <SyncedTextField
          field={note}
          axis="vertical"
          maxLength={NOTE_MAX}
          placeholder={t('rideSettle.dispute.placeholder')}
          testID="ride-dispute-note"
          modifiers={[
            lineLimit({ min: 2, max: 5 }),
            accessibilityLabel(t('rideSettle.dispute.label', { name })),
          ]}
        />
        <Text modifiers={[accessibilityIdentifier('ride-dispute-count')]}>
          {t('ride.create.form.count', { count: length(typed), max: NOTE_MAX })}
        </Text>
      </Section>
    </SheetShell>
  );
}

export type ChangeRequest = { id: number; open: boolean; member: string };

export function ChangeShareSheet({
  request,
  ride,
  onSave,
  onClose,
}: {
  request: ChangeRequest | null;
  ride: RideDetail | null;
  onSave: (member: string, minor: number) => void;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const ref = useRef<TextFieldRef>(null);
  const rider = ride?.settle?.riders.find((r) => r.id === request?.member) ?? null;
  const [text, setText] = useState(rider ? shareText(rider.share, deviceDecimal()) : '');
  const field = useSyncedText(text, setText);
  if (!request || !ride?.settle || !rider) return null;
  const { total } = ride.settle;
  const others = ride.settle.riders
    .filter((r) => r.id !== rider.id)
    .reduce((sum, r) => sum + r.share.minor, 0);
  const parsed = parseEstimate(text, total.currency, deviceDecimal());
  const valid = parsed !== null && parsed.minor > 0 && others + parsed.minor <= total.minor;
  const name = rider.name ?? t('bounty.post.unknownName');
  const mine = valid ? { ...total, minor: total.minor - others - parsed.minor } : null;
  return (
    <SheetShell
      open={request.open}
      title={t('rideSettle.change.title', { name })}
      confirm={t('rideSettle.change.save')}
      confirmDisabled={!valid}
      testID="ride-change"
      onConfirm={() => {
        const typed = parseEstimate(field.sync(), total.currency, deviceDecimal());
        const fits = typed !== null && typed.minor > 0 && others + typed.minor <= total.minor;
        if (typed && fits) onSave(rider.id, typed.minor);
      }}
      onClose={onClose}
    >
      <Section
        footer={
          <Text modifiers={[accessibilityIdentifier('ride-change-footer')]}>
            {mine
              ? t('rideSettle.change.footer', { amount: formatMoney(mine, language) })
              : t('rideSettle.change.over')}
          </Text>
        }
      >
        <FieldRow field={ref}>
          <Text>{t('rideSettle.change.label', { name })}</Text>
          <Spacer />
          <Text modifiers={[secondary]}>{CURRENCIES[total.currency].symbol}</Text>
          <SyncedTextField
            ref={ref}
            field={field}
            maxLength={8}
            testID="ride-change-amount"
            modifiers={[
              keyboardType('decimal-pad'),
              multilineTextAlignment('trailing'),
              accessibilityLabel(t('rideSettle.change.label', { name })),
            ]}
          />
        </FieldRow>
      </Section>
    </SheetShell>
  );
}
