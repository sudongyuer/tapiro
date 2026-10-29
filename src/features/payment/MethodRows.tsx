import { Button, HStack, Image, Link, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityHint,
  accessibilityIdentifier,
  disabled,
  font,
  foregroundStyle,
  monospacedDigit,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { CURRENCIES, formatMoney, type CurrencyCode } from '@/lib/money';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { blockedCurrency, type MethodRow } from './amounts';
import { secondary } from './formParts';
import { FX_TERMS_URL, rateText } from './fx';
import { optionTitle } from './MethodDetail';
import type { FxRate } from './types';

export function MethodRows({
  rows,
  selectedId,
  onSelect,
  name,
  original,
  converted,
  rate,
}: {
  rows: readonly MethodRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  name: string;
  original: CurrencyCode;
  converted: boolean;
  rate: FxRate | null;
}) {
  const { t, language } = useI18n();
  const locked = converted && rate ? rateText(rate, original, language) : null;
  return (
    <Section
      title={t('pay.sheet.methodsHeader')}
      footer={
        <VStack alignment="leading" spacing={vars['--space-1']}>
          <Text>
            {rows.length === 1
              ? t('pay.sheet.methodsFooterOne', { name })
              : t('pay.sheet.methodsFooterPick')}
          </Text>
          {locked ? (
            <Text modifiers={[accessibilityIdentifier('pay-rate-footer')]}>
              {t('pay.sheet.rateFooter', locked)}
            </Text>
          ) : null}
          {locked ? (
            <Link
              label={t('pay.sheet.fxSource')}
              destination={FX_TERMS_URL}
              modifiers={[
                accessibilityHint(t('pay.sheet.fxSourceHint')),
                accessibilityIdentifier('pay-fx-source'),
              ]}
            />
          ) : null}
        </VStack>
      }
    >
      {rows.map((row) => (
        <MethodRowButton
          key={row.option.id}
          row={row}
          selected={row.option.id === selectedId}
          onPress={() => onSelect(row.option.id)}
        />
      ))}
    </Section>
  );
}

function MethodRowButton({
  row,
  selected,
  onPress,
}: {
  row: MethodRow;
  selected: boolean;
  onPress: () => void;
}) {
  const { t, language } = useI18n();
  const { color } = useTheme();
  const { option, amount } = row;
  const blocked = blockedCurrency(row);
  const detail = blocked
    ? t('pay.sheet.noRate', { currency: CURRENCIES[blocked].symbol })
    : option.kind === 'cash'
      ? ''
      : option.payeeName;
  return (
    <Button
      onPress={onPress}
      testID={`pay-method-${option.type}-${option.id}`}
      modifiers={[disabled(blocked !== null)]}
    >
      <HStack
        spacing={vars['--space-3']}
        modifiers={[
          accessibilityElement('combine'),
          ...(selected ? [accessibilityAddTraits(['isSelected'])] : []),
        ]}
      >
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Text
            modifiers={[
              foregroundStyle({ type: 'hierarchical', style: blocked ? 'secondary' : 'primary' }),
            ]}
          >
            {optionTitle(t, option)}
          </Text>
          {detail ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>{detail}</Text>
          ) : null}
        </VStack>
        <Spacer />
        {amount ? (
          <Text
            modifiers={[
              font({ textStyle: 'body', weight: 'semibold' }),
              monospacedDigit(),
              foregroundStyle({ type: 'hierarchical', style: 'primary' }),
            ]}
          >
            {formatMoney(amount, language)}
          </Text>
        ) : null}
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
