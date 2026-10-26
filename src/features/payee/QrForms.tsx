import {
  Button,
  Form,
  Host,
  LabeledContent,
  Section,
  Text,
  TextField,
  useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  autocorrectionDisabled,
  buttonStyle,
  controlSize,
  font,
  foregroundStyle,
  textContentType,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import type { ClassifiedQr, QrRejection } from './classifyQr';
import { methodTitle, qrBank, walletName, type QrWallet } from './display';
import type { PayeeMethod } from './methods';
import { NoticeCard } from '@/ui/NoticeCard';
import { EditActions, SheetChrome } from './SheetChrome';
import { PAYEE_NAME_MAX } from './validate';

export type QrError =
  QrRejection | 'denied' | 'unavailable' | 'failed' | 'saveFailed' | 'nameEmpty' | 'nameInvalid';

function QrErrorCard({ error, wallet }: { error: QrError; wallet: string }) {
  const { t } = useI18n();
  if (error === 'nameEmpty' || error === 'nameInvalid')
    return (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t(`payee.qr.nameError.${error === 'nameEmpty' ? 'empty' : 'invalid'}`, { wallet })}
        testID="payee-qr-error-name"
      />
    );
  if (error === 'saveFailed')
    return (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.circle.fill"
        title={t('payee.form.error.saveFailed')}
        testID="payee-qr-error-saveFailed"
      />
    );
  return (
    <NoticeCard
      tone="urgent"
      icon={error === 'payingCode' ? 'hand.raised.fill' : 'exclamationmark.circle.fill'}
      title={t(`payee.qr.error.${error}.title`)}
      body={t(`payee.qr.error.${error}.body`)}
      testID={`payee-qr-error-${error}`}
    />
  );
}

export function QrPickForm({
  title,
  wallet,
  error,
  onClose,
  onPick,
  onScan,
}: {
  title: string;
  wallet?: QrWallet;
  error: QrError | null;
  onClose: () => void;
  onPick: () => void;
  onScan: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host style={styles.host} testID="payee-qr-sheet">
      <SheetChrome title={title} onClose={onClose} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {error ? <QrErrorCard error={error} wallet="" /> : null}
        <Section footer={<Text>{t('payee.qr.footer')}</Text>}>
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              accessibilityIdentifier('payee-qr-steps'),
            ]}
          >
            {wallet ? t(`payee.qr.steps.${wallet}`) : t('payee.qr.hint')}
          </Text>
          <Button
            label={t('payee.qr.pick')}
            systemImage="photo.on.rectangle"
            onPress={onPick}
            testID="payee-qr-pick"
            modifiers={[
              buttonStyle('borderedProminent'),
              controlSize('large'),
              foregroundStyle(color('--color-on-accent')),
            ]}
          />
          <Button
            label={t('payee.qr.scan')}
            systemImage="qrcode.viewfinder"
            onPress={onScan}
            testID="payee-qr-scan"
            modifiers={[foregroundStyle(color('--color-accent'))]}
          />
        </Section>
      </Form>
    </Host>
  );
}

export function QrConfirmForm({
  title,
  qr,
  mismatch,
  error,
  existing,
  initialName,
  onClose,
  onSave,
  onNameEdit,
  onRetry,
  onMakeDefault,
  onDelete,
}: {
  title: string;
  qr: ClassifiedQr;
  mismatch: ClassifiedQr | null;
  error: QrError | null;
  existing: PayeeMethod | null;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  onNameEdit: () => void;
  onRetry: () => void;
  onMakeDefault: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const duitNow = qr.type === 'duitnow_qr' ? qr : null;
  const typeLabel = duitNow
    ? t(duitNow.business ? 'payee.qr.typeBusiness' : 'payee.qr.typeDuitNow', {
        bank: qrBank(duitNow),
      })
    : methodTitle(t, qr);
  const wallet = qr.type === 'alipay' || qr.type === 'wechat' ? qr.type : null;
  const nameText = useNativeState(initialName);
  const [typedName, setTypedName] = useState(initialName);
  const trimmed = typedName.trim().replace(/\s+/g, ' ');
  const seen = duitNow
    ? t('payee.qr.seen', { name: duitNow.name, bank: qrBank(duitNow) })
    : trimmed
      ? t('payee.qr.seen', { name: trimmed, bank: walletName(t, qr) })
      : t('payee.qr.seenWallet', { method: methodTitle(t, qr) });
  return (
    <Host style={styles.host} testID="payee-qr-confirm">
      <SheetChrome title={title} onClose={onClose} onSave={() => onSave(nameText.get())} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {error ? <QrErrorCard error={error} wallet={walletName(t, qr)} /> : null}
        {mismatch ? (
          <NoticeCard
            tone="warning"
            icon="questionmark.circle.fill"
            title={t('payee.qr.mismatch', {
              wallet: walletName(t, mismatch),
              method: methodTitle(t, mismatch),
            })}
            testID="payee-qr-mismatch"
          />
        ) : null}
        <Section footer={<Text>{t(duitNow ? 'payee.qr.note' : 'payee.qr.walletNote')}</Text>}>
          <LabeledContent label={t('payee.qr.typeLabel')}>
            <Text>{typeLabel}</Text>
          </LabeledContent>
          {duitNow ? (
            <LabeledContent label={t('payee.qr.payeeLabel')}>
              <Text>{duitNow.name}</Text>
            </LabeledContent>
          ) : null}
          <Text
            modifiers={[font({ textStyle: 'headline' }), accessibilityIdentifier('payee-qr-seen')]}
          >
            {seen}
          </Text>
        </Section>
        {wallet ? (
          <Section
            title={t(`payee.qr.nameLabel.${wallet}`)}
            footer={<Text>{t(`payee.qr.nameFooter.${wallet}`)}</Text>}
          >
            <TextField
              text={nameText}
              maxLength={PAYEE_NAME_MAX}
              onTextChange={(next: string) => {
                setTypedName(next);
                onNameEdit();
              }}
              placeholder={t(`payee.qr.namePlaceholder.${wallet}`)}
              testID="payee-name-input"
              modifiers={[
                textContentType('name'),
                textInputAutocapitalization('never'),
                autocorrectionDisabled(),
              ]}
            />
          </Section>
        ) : null}
        <Section>
          <Button
            label={t('payee.qr.retry')}
            systemImage="photo.on.rectangle"
            onPress={onRetry}
            testID="payee-qr-retry"
            modifiers={[foregroundStyle(color('--color-accent'))]}
          />
        </Section>
        {existing ? (
          <EditActions
            isDefault={existing.isDefault}
            onMakeDefault={onMakeDefault}
            onDelete={onDelete}
          />
        ) : null}
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
