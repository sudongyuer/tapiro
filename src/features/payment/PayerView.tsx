import { HStack, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { formatMoney, type Money } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetLayer } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';

import { methodRows, payerChoice } from './amounts';
import { secondary } from './formParts';
import type { SheetAction, SheetData } from './hooks';
import { MethodDetail } from './MethodDetail';
import { MethodRows } from './MethodRows';
import { payOptions } from './payOptions';
import { ProofSection, type Proof } from './ProofSection';
import { QrFullScreen } from './QrFullScreen';

export function AmountHeader({
  title,
  money,
  note,
}: {
  title: string;
  money: Money;
  note: string | null;
}) {
  const { t, language } = useI18n();
  const amount = formatMoney(money, language);
  return (
    <Section>
      <HStack>
        <Spacer />
        <VStack
          spacing={vars['--space-1']}
          modifiers={[accessibilityElement('combine'), accessibilityIdentifier('pay-amount')]}
        >
          <Text modifiers={[font({ textStyle: 'headline' }), multilineTextAlignment('center')]}>
            {title}
          </Text>
          <Text
            modifiers={[
              font({ size: vars['--text-amount-compact'], weight: 'heavy', design: 'rounded' }),
              accessibilityLabel(t('pay.sheet.amountLabel', { amount })),
            ]}
          >
            {amount}
          </Text>
          {note ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{note}</Text>
          ) : null}
        </VStack>
        <Spacer />
      </HStack>
    </Section>
  );
}

export function PayerView({
  data,
  busy,
  onMarkPaid,
}: {
  data: SheetData;
  busy: SheetAction | null;
  onMarkPaid: (methodId: string, proof: Proof, setProof: (next: Proof) => void) => void;
}) {
  const { t } = useI18n();
  const { payment, methods, detail } = data;
  const choice = payerChoice(methodRows(payOptions(methods), detail.methods), payment.amount);
  const rows = choice.kind === 'methods' ? choice.rows : [];
  const [selectedId, setSelectedId] = useState(() =>
    choice.kind === 'methods' ? choice.initial : null,
  );
  const [proof, setProof] = useState<Proof>({ status: 'none' });
  const [fullScreen, setFullScreen] = useState(false);
  const selected = rows.find((row) => row.amount && row.option.id === selectedId)?.option;
  const name = payment.counterpartName;
  const payeeName = selected && selected.kind !== 'cash' ? selected.payeeName : name;

  return (
    <>
      {selected && selected.kind !== 'cash' ? (
        <SheetActions>
          <PillButton
            label={t('pay.sheet.markPaid')}
            onPress={() => onMarkPaid(selected.id, proof, setProof)}
            disabled={busy !== null || proof.status === 'uploading'}
            loading={busy === 'markPaid' || proof.status === 'uploading'}
            testID="pay-mark-paid"
          />
        </SheetActions>
      ) : null}
      <AmountHeader title={t('pay.sheet.payTo', { name })} money={payment.amount} note={null} />
      {choice.kind === 'methods' ? (
        <MethodRows
          rows={rows}
          selectedId={selectedId}
          onSelect={setSelectedId}
          name={name}
          original={payment.amount.currency}
          converted={choice.converted}
          rate={detail.rate}
        />
      ) : (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.triangle.fill"
          title={
            choice.kind === 'none'
              ? t('pay.sheet.none.title', { name })
              : t('pay.sheet.noCurrency', {
                  name,
                  currency: t(`pay.sheet.currencyName.${choice.currency}`),
                })
          }
          body={t('pay.sheet.none.body')}
          testID="pay-no-methods"
        />
      )}
      {selected ? (
        <MethodDetail
          option={selected}
          reference={payment.reference}
          payeeName={payeeName}
          onFullScreen={() => setFullScreen(true)}
        />
      ) : null}
      {selected && selected.kind !== 'cash' ? (
        <>
          <NoticeCard
            tone="warning"
            icon="person.crop.circle.badge.checkmark"
            title={t('pay.sheet.nameCheck', { name: payeeName })}
            testID="pay-name-check"
          />
          <ProofSection proof={proof} onChange={setProof} />
        </>
      ) : null}
      <SheetLayer>
        {selected?.kind === 'qr' ? (
          <QrFullScreen
            payload={selected.payload}
            name={selected.payeeName}
            visible={fullScreen}
            onClose={() => setFullScreen(false)}
          />
        ) : null}
      </SheetLayer>
    </>
  );
}
