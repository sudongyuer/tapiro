import { Button, HStack, Image, Link, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  font,
  foregroundStyle,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { formatMoney, methodCurrency, type Money } from '@/lib/money';
import { NoticeCard } from '@/ui/NoticeCard';
import { PillButton } from '@/ui/PillButton';
import { SheetActions, SheetLayer } from '@/ui/SheetFrame';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { secondary } from './formParts';
import { convertedAt, FX_TERMS_URL } from './fx';
import type { SheetAction, SheetData } from './hooks';
import { MethodDetail, optionTitle } from './MethodDetail';
import { initialSelection, payOptions, type PayOption } from './payOptions';
import { ProofSection, type Proof } from './ProofSection';
import { QrFullScreen } from './QrFullScreen';

function referenceFor(option: PayOption | undefined, data: SheetData) {
  if (!option) return null;
  const { amount } = data.payment;
  return convertedAt(amount, methodCurrency(option.type, amount.currency), data.rate, new Date());
}

export function AmountHeader({
  title,
  money,
  reference,
}: {
  title: string;
  money: Money;
  reference: Money | null;
}) {
  const { t, language } = useI18n();
  const amount = formatMoney(money, language);
  return (
    <Section>
      <HStack>
        <Spacer />
        <VStack spacing={vars['--space-1']}>
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
            {reference !== null ? (
              <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
                {t('pay.sheet.cny', { amount: formatMoney(reference, language) })}
              </Text>
            ) : null}
          </VStack>
          {reference !== null ? (
            <Link
              label={t('pay.sheet.fxSource')}
              destination={FX_TERMS_URL}
              modifiers={[
                font({ textStyle: 'caption' }),
                accessibilityHint(t('pay.sheet.fxSourceHint')),
                accessibilityIdentifier('pay-fx-source'),
              ]}
            />
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
  const { payment, methods } = data;
  const options = payOptions(methods);
  const [selectedId, setSelectedId] = useState(() => initialSelection(options));
  const [proof, setProof] = useState<Proof>({ status: 'none' });
  const [fullScreen, setFullScreen] = useState(false);
  const selected = options.find((option) => option.id === selectedId);
  const name = payment.counterpartName;
  const payeeName = selected && selected.kind !== 'cash' ? selected.payeeName : name;
  const reference = referenceFor(selected, data);

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
      <AmountHeader
        title={t('pay.sheet.payTo', { name })}
        money={payment.amount}
        reference={reference}
      />
      {options.length === 0 ? (
        <NoticeCard
          tone="warning"
          icon="exclamationmark.triangle.fill"
          title={t('pay.sheet.none.title', { name })}
          body={t('pay.sheet.none.body')}
          testID="pay-no-methods"
        />
      ) : (
        <Section
          title={t('pay.sheet.methodsHeader')}
          footer={
            <Text>
              {options.length === 1
                ? t('pay.sheet.methodsFooterOne', { name })
                : t('pay.sheet.methodsFooterPick')}
            </Text>
          }
        >
          {options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              selected={option.id === selectedId}
              onPress={() => setSelectedId(option.id)}
            />
          ))}
        </Section>
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

function OptionRow({
  option,
  selected,
  onPress,
}: {
  option: PayOption;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const title = optionTitle(t, option);
  const detail = option.kind === 'cash' ? '' : option.payeeName;
  return (
    <Button onPress={onPress} testID={`pay-method-${option.type}-${option.id}`}>
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          accessibilityElement('combine'),
          ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
        ]}
      >
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
            {title}
          </Text>
          {detail ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{detail}</Text>
          ) : null}
        </VStack>
        <Spacer />
        {selected ? (
          <Image
            systemName="checkmark"
            size={17}
            modifiers={[foregroundStyle(color('--color-accent')), accessibilityHidden()]}
          />
        ) : null}
      </HStack>
    </Button>
  );
}
