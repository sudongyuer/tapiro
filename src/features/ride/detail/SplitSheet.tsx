import { Button, HStack, Section, Spacer, Text, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  keyboardType,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { CURRENCIES, formatMoney, POST_LIMITS, type CurrencyCode } from '@/lib/money';
import { FieldRow } from '@/ui/FieldRow';
import { SyncedTextField, useSyncedText } from '@/ui/SyncedTextField';

import { pickReceipt } from './receiptDevice';
import { SheetShell } from './SheetShell';
import { shareText, splitView, type SplitDraft, type SplitView } from './splitDraft';
import type { RideDetail } from './types';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const AMOUNT_DIGITS = 8;

export type SplitRequest = { id: number; open: boolean; draft: SplitDraft };

function footerText(
  view: SplitView,
  names: string,
  t: ReturnType<typeof useI18n>['t'],
  language: string,
) {
  const people = view.rows.length + 1;
  const limits = POST_LIMITS.ride[view.currency];
  const range = (minor: number) => formatMoney({ minor, currency: view.currency }, language);
  switch (view.issue) {
    case 'totalEmpty':
      return t('rideSettle.sheet.footerEmpty');
    case 'totalRange':
      return t('rideSettle.sheet.totalRange', {
        min: range(limits.minMinor),
        max: range(limits.maxMinor),
      });
    case 'overTotal':
      return t('rideSettle.sheet.overTotal');
    case 'shareText':
    case 'notWhole':
    case 'notPositive':
      return t('rideSettle.sheet.shareText');
    default:
      break;
  }
  const lead = view.equal
    ? view.extra
      ? t('rideSettle.sheet.footerEqual', {
          count: people,
          amount: formatMoney(view.extra, language),
        })
      : t('rideSettle.sheet.footerEqualExact', { count: people })
    : t('rideSettle.sheet.footerEdited');
  return `${lead}\n${t('rideSettle.sheet.sendTo', { names })}`;
}

function MoneyField({
  label,
  initial,
  currency,
  testID,
  onText,
}: {
  label: string;
  initial: string;
  currency: CurrencyCode;
  testID: string;
  onText: (text: string) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<TextFieldRef>(null);
  const field = useSyncedText(initial, onText);
  return (
    <FieldRow field={ref}>
      <Text>{label}</Text>
      <Spacer />
      <Text modifiers={[secondary]}>{CURRENCIES[currency].symbol}</Text>
      <SyncedTextField
        ref={ref}
        field={field}
        maxLength={AMOUNT_DIGITS}
        placeholder={t('rideSettle.sheet.placeholder')}
        testID={testID}
        modifiers={[
          keyboardType('decimal-pad'),
          multilineTextAlignment('trailing'),
          font({ weight: 'semibold', design: 'rounded' }),
          accessibilityLabel(label),
        ]}
      />
    </FieldRow>
  );
}

export function SplitSheet({
  request,
  ride,
  viewerId,
  onDraft,
  onSend,
  onClose,
}: {
  request: SplitRequest | null;
  ride: RideDetail | null;
  viewerId: string;
  onDraft: (draft: SplitDraft) => void;
  onSend: (draft: SplitDraft) => void;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState<SplitDraft | null>(request?.draft ?? null);
  const current = draft ?? request?.draft ?? null;
  if (!request || !ride || !current) return null;
  const edit = (change: (value: SplitDraft) => SplitDraft) =>
    setDraft((last) => {
      const next = change(last ?? current);
      onDraft(next);
      return next;
    });
  const view = splitView(ride, current);
  const names = view.rows
    .map((row) => row.name ?? t('bounty.post.unknownName'))
    .join(t('ride.detail.listJoin'));
  const me = ride.organiser?.name ?? '';
  const receipt = current.receipt;
  return (
    <SheetShell
      open={request.open}
      large
      title={t('rideSettle.sheet.title')}
      confirm={t('rideSettle.sheet.send', { count: view.rows.length })}
      confirmDisabled={view.issue !== null}
      testID="ride-split"
      onConfirm={() => onSend(current)}
      onClose={onClose}
    >
      <Section>
        <MoneyField
          label={t('rideSettle.sheet.total')}
          initial={current.totalText}
          currency={view.currency}
          testID="ride-split-total"
          onText={(text) => edit((value) => ({ ...value, totalText: text }))}
        />
      </Section>
      <Section
        footer={
          <Text modifiers={[accessibilityIdentifier(`ride-split-receipt-${receipt.status}`)]}>
            {receipt.status === 'failed'
              ? t('rideSettle.sheet.receiptFailed')
              : t('rideSettle.sheet.receiptOptional')}
          </Text>
        }
      >
        {receipt.status === 'none' ? (
          <Button
            label={t('rideSettle.sheet.receiptAdd')}
            systemImage="photo.badge.plus"
            onPress={async () => {
              const uri = await pickReceipt();
              if (uri) edit((value) => ({ ...value, receipt: { status: 'picked', uri } }));
            }}
            modifiers={[accessibilityIdentifier('ride-split-receipt-add')]}
          />
        ) : (
          <>
            <Text modifiers={[accessibilityIdentifier('ride-split-receipt-added')]}>
              {t('rideSettle.sheet.receiptAdded')}
            </Text>
            <Button
              label={t('rideSettle.sheet.receiptRemove')}
              role="destructive"
              onPress={() => edit((value) => ({ ...value, receipt: { status: 'none' } }))}
              modifiers={[accessibilityIdentifier('ride-split-receipt-remove')]}
            />
          </>
        )}
      </Section>
      <Section
        footer={
          <Text modifiers={[accessibilityIdentifier('ride-split-footer')]}>
            {footerText(view, names, t, language)}
          </Text>
        }
      >
        <HStack modifiers={[accessibilityIdentifier('ride-split-organiser')]}>
          <Text>{`${me} · ${t('rideSettle.sheet.you')}`}</Text>
          <Spacer />
          <Text modifiers={[font({ weight: 'semibold', design: 'rounded' })]}>
            {view.organiser ? formatMoney(view.organiser, language) : '–'}
          </Text>
        </HStack>
        {view.rows.map((row) => {
          const name = row.name ?? t('bounty.post.unknownName');
          const shown = row.share ? shareText(row.share) : '';
          return (
            <MoneyField
              key={row.edited ? row.id : `${row.id}-${shown}`}
              label={row.id === viewerId ? t('ride.detail.you') : name}
              initial={row.edited ? (current.shares[row.id] ?? '') : shown}
              currency={view.currency}
              testID={`ride-split-share-${row.id}`}
              onText={(text) => {
                if (!row.edited && text === shown) return;
                edit((value) => ({ ...value, shares: { ...value.shares, [row.id]: text } }));
              }}
            />
          );
        })}
      </Section>
    </SheetShell>
  );
}
