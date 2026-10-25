import { Form, Host, Image, HStack, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { formatRinggit } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { Celebration } from './Celebration';
import { ActionButton, secondary, TextSection } from './formParts';
import { usePaySheet, type SheetData } from './hooks';
import { AmountHeader, PayerView } from './PayerView';
import { PayeeView } from './PayeeView';
import type { Proof } from './ProofSection';

export function PaySheet({
  userId,
  paymentId,
  onClose,
}: {
  userId: string;
  paymentId: string;
  onClose: () => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const sheet = usePaySheet(userId, paymentId);
  const [celebrating, setCelebrating] = useState(false);
  const { state } = sheet;

  async function confirm() {
    const result = await sheet.confirm();
    if (!result) return;
    if (result.firstSettled) setCelebrating(true);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }

  // An uploaded proof keeps its path, so a failed 我已付款 is retried with the same file instead of a new upload.
  async function markPaid(methodId: string, proof: Proof, setProof: (next: Proof) => void) {
    let path: string | null = proof.status === 'uploaded' ? proof.path : null;
    if (proof.status === 'picked' || proof.status === 'failed') {
      setProof({ status: 'uploading', uri: proof.uri });
      try {
        path = await sheet.uploadProof(proof.uri);
      } catch {
        setProof({ status: 'failed', uri: proof.uri });
        return;
      }
      setProof({ status: 'uploaded', uri: proof.uri, path });
    }
    await sheet.markPaid(methodId, path);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('pay.sheet.title') }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('pay.sheet.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      <Host style={styles.root} testID="pay-sheet">
        <Form modifiers={[tint(color('--color-accent'))]}>
          {sheet.failed ? (
            <NoticeCard
              tone="urgent"
              icon="exclamationmark.circle.fill"
              title={t('pay.sheet.failed')}
              testID="pay-failed"
            />
          ) : null}
          {state.status === 'loading' ? (
            <TextSection title={t('pay.sheet.loading')} testID="pay-loading" />
          ) : state.status === 'failed' || state.status === 'missing' ? (
            <NoticeCard
              tone="urgent"
              icon="wifi.exclamationmark"
              title={t('pay.sheet.loadFailed.title')}
              body={t('pay.sheet.loadFailed.body')}
              action={{ label: t('pay.sheet.retry'), onPress: sheet.retry, testID: 'pay-retry' }}
              testID="pay-load-failed"
            />
          ) : (
            <SheetBody data={state} sheet={sheet} onConfirm={confirm} onMarkPaid={markPaid} />
          )}
        </Form>
      </Host>
      {celebrating && state.status === 'ready' ? (
        <Celebration
          title={t('pay.celebrate.title')}
          body={t('pay.celebrate.body', {
            title: state.payment.title,
            amount: formatRinggit(state.payment.amountSen, language),
          })}
          onDone={() => setCelebrating(false)}
        />
      ) : null}
    </View>
  );
}

function SheetBody({
  data,
  sheet,
  onConfirm,
  onMarkPaid,
}: {
  data: SheetData;
  sheet: ReturnType<typeof usePaySheet>;
  onConfirm: () => void;
  onMarkPaid: (methodId: string, proof: Proof, setProof: (next: Proof) => void) => void;
}) {
  const { t, language } = useI18n();
  const { payment } = data;
  const name = payment.counterpartName;
  const amount = formatRinggit(payment.amountSen, language);

  if (payment.state === 'settled') return <Settled data={data} />;
  if (payment.role === 'payee')
    return (
      <PayeeView
        data={data}
        busy={sheet.busy}
        onConfirm={onConfirm}
        onNotReceived={sheet.notReceived}
        proofUrl={sheet.proofUrl}
      />
    );
  if (payment.state === 'due')
    return <PayerView data={data} busy={sheet.busy} onMarkPaid={onMarkPaid} />;
  return (
    <>
      <AmountHeader
        title={t('pay.sheet.payTo', { name })}
        amountSen={payment.amountSen}
        cny={null}
      />
      <TextSection
        title={t('pay.sheet.waiting.title', { name })}
        body={
          payment.proofPath
            ? t('pay.sheet.waiting.bodyProof', { amount })
            : t('pay.sheet.waiting.body', { amount })
        }
        testID="pay-waiting"
      />
      {payment.nudgedAt ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.bubble.fill"
          title={t('pay.sheet.waiting.nudged', { name })}
          testID="pay-nudged"
        />
      ) : null}
      {payment.state === 'marked_paid' ? (
        <Section>
          <ActionButton
            label={t('pay.sheet.waiting.undo')}
            tone="urgent"
            onPress={sheet.undo}
            disabled={sheet.busy !== null}
            testID="pay-undo"
          />
        </Section>
      ) : null}
    </>
  );
}

function Settled({ data }: { data: SheetData }) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const amount = formatRinggit(data.payment.amountSen, language);
  return (
    <Section>
      <HStack
        spacing={vars['--space-3']}
        modifiers={[accessibilityElement('combine'), accessibilityIdentifier('pay-settled')]}
      >
        <Image
          systemName="checkmark.circle.fill"
          size={28}
          modifiers={[foregroundStyle(color('--color-success'))]}
        />
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Text modifiers={[font({ textStyle: 'headline' })]}>
            {data.payment.role === 'payee'
              ? t('pay.celebrate.tick', { amount })
              : t('pay.sheet.settled.title')}
          </Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
            {t('pay.sheet.settled.body', { amount, title: data.payment.title })}
          </Text>
        </VStack>
      </HStack>
    </Section>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
