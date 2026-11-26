import { Button, HStack, ProgressView, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';

import { canRead, isReading, readNote, type ReadNote, type ReceiptRead } from './receiptRead';
import type { SplitDraft } from './splitDraft';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export function noteText(note: ReadNote, t: ReturnType<typeof useI18n>['t'], language: string) {
  switch (note.kind) {
    case 'offer':
    case 'unreadable':
      return t(`rideSettle.sheet.read.${note.kind}`);
    case 'failed':
      return t(`rideSettle.sheet.read.${note.reason}`);
    default:
      return t(`rideSettle.sheet.read.${note.kind}`, {
        amount: formatMoney(note.amount, language),
      });
  }
}

export function SplitReceipt({
  draft,
  read,
  readable,
  onAdd,
  onRemove,
  onRead,
}: {
  draft: SplitDraft;
  read: ReceiptRead;
  readable: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onRead: () => void;
}) {
  const { t } = useI18n();
  const { receipt } = draft;
  const note = readable ? readNote(read, draft) : null;
  const base =
    receipt.status === 'failed'
      ? t('rideSettle.sheet.receiptFailed')
      : receipt.status === 'expired'
        ? t('rideSettle.sheet.receiptExpired')
        : t('rideSettle.sheet.receiptOptional');
  const footer = note?.kind === 'offer' ? `${base}\n\n${t('rideSettle.sheet.read.offer')}` : base;
  return (
    <Section
      footer={
        <Text modifiers={[accessibilityIdentifier(`ride-split-receipt-${receipt.status}`)]}>
          {footer}
        </Text>
      }
    >
      {receipt.status === 'none' || receipt.status === 'expired' ? (
        <Button
          label={t('rideSettle.sheet.receiptAdd')}
          systemImage="photo.badge.plus"
          onPress={onAdd}
          modifiers={[accessibilityIdentifier('ride-split-receipt-add')]}
        />
      ) : (
        <>
          <Text modifiers={[accessibilityIdentifier('ride-split-receipt-added')]}>
            {t('rideSettle.sheet.receiptAdded')}
          </Text>
          {readable && isReading(read, draft) ? (
            <HStack
              spacing={8}
              modifiers={[
                accessibilityElement('combine'),
                accessibilityIdentifier('ride-split-read-busy'),
              ]}
            >
              <ProgressView />
              <Text modifiers={[secondary]}>{t('rideSettle.sheet.read.reading')}</Text>
            </HStack>
          ) : null}
          {readable && canRead(read, draft) ? (
            <Button
              label={t('rideSettle.sheet.read.button')}
              systemImage="text.viewfinder"
              onPress={onRead}
              modifiers={[accessibilityIdentifier('ride-split-read')]}
            />
          ) : null}
          <Button
            label={t('rideSettle.sheet.receiptRemove')}
            role="destructive"
            onPress={onRemove}
            modifiers={[accessibilityIdentifier('ride-split-receipt-remove')]}
          />
        </>
      )}
    </Section>
  );
}
