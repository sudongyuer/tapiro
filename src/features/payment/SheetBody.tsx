import { HStack, Image, Section, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { originalIfConverted, paidAmount } from './amounts';
import { ActionButton, secondary, TextSection } from './formParts';
import type { SheetData, usePaySheet } from './hooks';
import { AmountHeader, PayerView } from './PayerView';
import { PayeeView } from './PayeeView';
import type { Proof } from './ProofSection';
import type { Payment } from './types';

export type Remind = { onPress: (payment: Payment) => void; busy: boolean };

export function SheetBody({
  data,
  sheet,
  onConfirm,
  onMarkPaid,
  remind,
  offline,
}: {
  data: SheetData;
  sheet: ReturnType<typeof usePaySheet>;
  onConfirm: () => void;
  onMarkPaid: (methodId: string, proof: Proof, setProof: (next: Proof) => void) => void;
  remind: Remind;
  offline: boolean;
}) {
  const { t, language } = useI18n();
  const { payment } = data;
  const name = payment.counterpartName;
  const paid = paidAmount(payment);
  const amount = formatMoney(paid, language);
  const original = originalIfConverted(payment);

  if (payment.state === 'settled') return <Settled data={data} />;
  if (payment.role === 'payee')
    return (
      <PayeeView
        data={data}
        busy={sheet.busy}
        onConfirm={onConfirm}
        onNotReceived={sheet.notReceived}
        proofUrl={sheet.proofUrl}
        offline={offline}
      />
    );
  if (payment.state === 'due')
    return (
      <PayerView
        data={data}
        busy={sheet.busy}
        onMarkPaid={onMarkPaid}
        onCantPay={sheet.cantPay}
        offline={offline}
        onRemind={() => remind.onPress(payment)}
        reminding={remind.busy}
      />
    );
  return (
    <>
      <AmountHeader
        title={t('pay.sheet.payTo', { name })}
        money={paid}
        note={
          original ? t('pay.sheet.original', { amount: formatMoney(original, language) }) : null
        }
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
            disabled={sheet.busy !== null || offline}
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
  const amount = formatMoney(paidAmount(data.payment), language);
  const payee = data.payment.role === 'payee';
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
            {payee ? t('pay.celebrate.tick', { amount }) : t('pay.sheet.settled.title')}
          </Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
            {payee
              ? data.payment.title
              : t('pay.sheet.settled.body', { amount, title: data.payment.title })}
          </Text>
        </VStack>
      </HStack>
    </Section>
  );
}
