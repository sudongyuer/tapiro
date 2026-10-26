import { Section } from '@expo/ui/swift-ui';

import { useI18n } from '@/lib/i18n';
import type { PayeeType } from '@/lib/payeeMethods';
import { formatRinggit } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { useState, type ReactNode } from 'react';

import { ActionButton, TextSection } from './formParts';
import type { SheetAction, SheetData } from './hooks';
import { AmountHeader } from './PayerView';
import { takesCash } from './payOptions';
import { ProofViewer } from './ProofViewer';
import { SheetFrame } from './SheetFrame';

export function PayeeView({
  data,
  busy,
  notice,
  onConfirm,
  onNotReceived,
  proofUrl,
}: {
  data: SheetData;
  busy: SheetAction | null;
  notice: ReactNode;
  onConfirm: () => void;
  onNotReceived: () => void;
  proofUrl: (path: string) => Promise<string>;
}) {
  const { t, language } = useI18n();
  const [viewing, setViewing] = useState<string | null>(null);
  const { payment, methods } = data;
  const name = payment.counterpartName;
  const amount = formatRinggit(payment.amountSen, language);
  const methodName = (type: PayeeType | null) =>
    type === 'duitnow_qr'
      ? t('payee.types.duitnow_qr_generic')
      : type
        ? t(`payee.types.${type}`)
        : '';

  const confirm = (
    <PillButton
      label={t('pay.payee.received')}
      onPress={onConfirm}
      disabled={busy !== null}
      testID="pay-confirm"
    />
  );

  if (payment.state === 'due') {
    const cash = takesCash(methods);
    return (
      <SheetFrame notice={notice} actions={cash ? confirm : null}>
        <AmountHeader title={payment.title} amountSen={payment.amountSen} cny={null} />
        {cash ? (
          <TextSection
            title={t('pay.payee.dueCash', { name })}
            body={t('pay.payee.dueCashBody')}
            testID="pay-payee-due-cash"
          />
        ) : (
          <TextSection
            title={t('pay.payee.dueWait', { name })}
            body={t('pay.payee.dueWaitBody')}
            testID="pay-payee-due"
          />
        )}
      </SheetFrame>
    );
  }

  return (
    <SheetFrame
      notice={notice}
      actions={
        <>
          {confirm}
          {payment.nudgedAt ? null : (
            <PillButton
              label={t('pay.payee.notReceived')}
              variant="plain"
              onPress={onNotReceived}
              disabled={busy !== null}
              testID="pay-not-received"
            />
          )}
        </>
      }
    >
      <AmountHeader title={payment.title} amountSen={payment.amountSen} cny={null} />
      <TextSection
        title={t('pay.payee.saysPaid', { name })}
        body={[
          t('pay.payee.saysPaidBody', { amount, method: methodName(payment.methodType) }),
          payment.proofPath ? t('pay.payee.proof') : null,
          t('pay.payee.checkHint'),
        ]
          .filter(Boolean)
          .join('\n')}
        testID="pay-payee-says-paid"
      />
      {payment.proofPath ? (
        <Section>
          <ActionButton
            label={t('pay.payee.viewProof')}
            tone="plain"
            onPress={() => setViewing(payment.proofPath)}
            testID="pay-view-proof"
          />
        </Section>
      ) : null}
      <ProofViewer path={viewing} load={proofUrl} onClose={() => setViewing(null)} />
      {payment.nudgedAt ? (
        <NoticeCard
          tone="warning"
          icon="clock.badge.exclamationmark"
          title={t('pay.payee.nudged', { name })}
          body={t('pay.payee.report')}
          testID="pay-payee-nudged"
        />
      ) : null}
    </SheetFrame>
  );
}
