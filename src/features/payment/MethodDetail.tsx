import { HStack, Image, Section, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  frame,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import type { TFunction } from 'i18next';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';

import { ActionButton, CopyRow, secondary } from './formParts';
import { confirmedLink, type PayOption } from './payOptions';
import { payDevice } from './services';
import { useQrImage } from './useQrImage';

const QR_PREVIEW = 168;
const QR_SAVE = 512;

export function optionTitle(t: TFunction, option: PayOption) {
  if (option.kind === 'cash') return t('payee.types.cash');
  if (option.kind === 'transfer')
    return option.type === 'duitnow_id'
      ? t('payee.types.duitnow_id')
      : (option.bank ?? t('payee.types.bank_account'));
  if (option.app === 'tng') return t('payee.types.tng');
  if (option.type === 'duitnow_qr')
    return option.bank
      ? t('payee.types.duitnow_qr', { bank: option.bank })
      : t('payee.types.duitnow_qr_generic');
  return t(`payee.types.${option.type}`);
}

export function qrPrimary(option: Extract<PayOption, { kind: 'qr' }>) {
  const link = confirmedLink(option.app);
  return { link, key: link && option.app ? 'saveAndOpen' : 'save' } as const;
}

export function MethodDetail({
  option,
  reference,
  payeeName,
  onFullScreen,
}: {
  option: PayOption;
  reference: string;
  payeeName: string;
  onFullScreen: () => void;
}) {
  const { t } = useI18n();
  if (option.kind === 'cash')
    return (
      <Section>
        <Text modifiers={[accessibilityIdentifier('pay-cash-note')]}>
          {t('pay.sheet.cash', { name: payeeName })}
        </Text>
      </Section>
    );
  const referenceRow = (
    <Section footer={<Text>{t('pay.sheet.referenceFooter', { name: payeeName })}</Text>}>
      <CopyRow label={t('pay.sheet.reference')} value={reference} testID="pay-reference" />
    </Section>
  );
  if (option.kind === 'transfer') {
    const label =
      option.type === 'duitnow_id'
        ? t('pay.sheet.phone')
        : option.bank
          ? t('pay.sheet.account', { bank: option.bank })
          : t('pay.sheet.accountGeneric');
    return (
      <>
        <Section
          footer={
            <Text>
              {option.type === 'duitnow_id' ? t('pay.sheet.bankHint') : t('pay.sheet.accountHint')}
            </Text>
          }
        >
          <CopyRow
            label={label}
            value={option.display}
            copyValue={option.copyValue}
            testID="pay-number"
          />
        </Section>
        {referenceRow}
      </>
    );
  }
  return (
    <>
      <QrSection option={option} onFullScreen={onFullScreen} />
      {referenceRow}
    </>
  );
}

function QrSection({
  option,
  onFullScreen,
}: {
  option: Extract<PayOption, { kind: 'qr' }>;
  onFullScreen: () => void;
}) {
  const { t } = useI18n();
  const uri = useQrImage(option.payload, QR_PREVIEW);
  const [saved, setSaved] = useState<'idle' | 'saved' | 'failed'>('idle');
  const primary = qrPrimary(option);
  const app = option.app ? t(`pay.sheet.apps.${option.app}`) : '';
  const hint = t(`pay.sheet.qr.hint.${option.app ?? 'bank'}`);

  async function save() {
    const file = await payDevice.qrImage(option.payload, QR_SAVE).catch(() => null);
    if (!file) return setSaved('failed');
    const ok = await payDevice.saveToPhotos(file);
    setSaved(ok ? 'saved' : 'failed');
    if (ok && primary.link) await payDevice.open(primary.link);
  }

  return (
    <Section
      footer={
        <Text modifiers={[accessibilityIdentifier(`pay-qr-status-${saved}`)]}>
          {saved === 'saved'
            ? `${t('pay.sheet.qr.saved')} · ${hint}`
            : saved === 'failed'
              ? t('pay.sheet.qr.saveFailed')
              : hint}
        </Text>
      }
    >
      <HStack>
        <Spacer />
        {uri ? (
          <Image
            uiImage={uri}
            modifiers={[
              resizable(),
              frame({ width: QR_PREVIEW, height: QR_PREVIEW }),
              accessibilityLabel(t('pay.sheet.qr.imageLabel', { name: option.payeeName })),
              accessibilityIdentifier('pay-qr-image'),
            ]}
          />
        ) : (
          <Text
            modifiers={[
              frame({ width: QR_PREVIEW, height: QR_PREVIEW }),
              secondary,
              font({ textStyle: 'footnote' }),
            ]}
          >
            {t('pay.sheet.loading')}
          </Text>
        )}
        <Spacer />
      </HStack>
      <ActionButton
        label={
          primary.key === 'saveAndOpen'
            ? t('pay.sheet.qr.saveAndOpen', { app })
            : t('pay.sheet.qr.save')
        }
        onPress={save}
        disabled={!uri}
        testID="pay-qr-save"
      />
      <ActionButton
        label={t('pay.sheet.qr.otherPhone')}
        onPress={onFullScreen}
        tone="plain"
        testID="pay-qr-full"
      />
    </Section>
  );
}
