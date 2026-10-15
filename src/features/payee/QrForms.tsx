import { Button, Form, Host, LabeledContent, Section, Text } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  buttonStyle,
  controlSize,
  font,
  foregroundStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import type { ClassifiedQr, QrRejection } from './classifyQr';
import { methodTitle, qrBank } from './display';
import type { PayeeMethod } from './methods';
import { NoticeCard } from './NoticeCard';
import { EditActions, SheetChrome } from './SheetChrome';

export type QrError = QrRejection | 'denied' | 'unavailable' | 'failed' | 'saveFailed';

function QrErrorCard({ error }: { error: QrError }) {
  const { t } = useI18n();
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
  error,
  onClose,
  onPick,
  onScan,
}: {
  error: QrError | null;
  onClose: () => void;
  onPick: () => void;
  onScan: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host style={styles.host} testID="payee-qr-sheet">
      <SheetChrome title={t('payee.qr.title')} onClose={onClose} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {error ? <QrErrorCard error={error} /> : null}
        <Section footer={<Text>{t('payee.qr.footer')}</Text>}>
          <Text modifiers={[font({ textStyle: 'subheadline' })]}>{t('payee.qr.hint')}</Text>
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
  qr,
  error,
  existing,
  onClose,
  onSave,
  onRetry,
  onMakeDefault,
  onDelete,
}: {
  qr: ClassifiedQr;
  error: QrError | null;
  existing: PayeeMethod | null;
  onClose: () => void;
  onSave: () => void;
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
  const seen = duitNow
    ? t('payee.qr.seen', { name: duitNow.name, bank: qrBank(duitNow) })
    : t('payee.qr.seenWallet', { method: methodTitle(t, qr) });
  return (
    <Host style={styles.host} testID="payee-qr-confirm">
      <SheetChrome title={t('payee.qr.title')} onClose={onClose} onSave={onSave} />
      <Form modifiers={[tint(color('--color-accent'))]}>
        {error ? <QrErrorCard error={error} /> : null}
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
