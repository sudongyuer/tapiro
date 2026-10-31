import {
  Button,
  HStack,
  Image,
  Menu,
  Picker,
  Section,
  Spacer,
  Text,
  type TextFieldRef,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  contentShape,
  controlSize,
  font,
  lineLimit,
  foregroundStyle,
  frame,
  imageScale,
  keyboardType,
  menuStyle,
  multilineTextAlignment,
  pickerStyle,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useRef } from 'react';

import { useI18n } from '@/lib/i18n';
import {
  CURRENCIES,
  CURRENCY_CODES,
  formatMoney,
  formatMoneyRange,
  isCurrencyCode,
  type CurrencyCode,
} from '@/lib/money';
import type { BountyCategory } from '@/lib/stickers/category';
import { SyncedTextField, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';

import { FieldRow, ROW_INSETS } from './FieldRow';
import { rewardAmounts, rewardSuggestion } from './postKinds';
import { rewardLimits } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
// A regular bordered button adds 7 pt above and below its label (measured 34 pt around a 20 pt label).
export const CHIP_LABEL_HEIGHT = vars['--touch-min'] - 14;

function CurrencyMenu({
  currency,
  onChange,
}: {
  currency: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}) {
  const { t } = useI18n();
  const item = (code: CurrencyCode) =>
    t('bounty.post.form.currencyItem', {
      symbol: CURRENCIES[code].symbol,
      name: t(`bounty.post.form.currencyName.${code}`),
    });
  return (
    <Menu
      label={
        <HStack
          spacing={vars['--space-1']}
          modifiers={[
            frame({ minWidth: vars['--touch-min'], minHeight: vars['--touch-min'] }),
            contentShape(shapes.rectangle()),
          ]}
        >
          <Text modifiers={[secondary]}>{CURRENCIES[currency].symbol}</Text>
          <Image systemName="chevron.down" modifiers={[imageScale('small'), secondary]} />
        </HStack>
      }
      modifiers={[
        menuStyle('button'),
        buttonStyle('borderless'),
        accessibilityLabel(t('bounty.post.form.currency')),
        accessibilityValue(item(currency)),
        accessibilityIdentifier('bounty-post-currency'),
      ]}
    >
      <Picker
        label={t('bounty.post.form.currency')}
        selection={currency}
        onSelectionChange={(next: string) => {
          if (isCurrencyCode(next) && next !== currency) onChange(next);
        }}
        modifiers={[pickerStyle('inline')]}
      >
        {CURRENCY_CODES.map((code) => (
          <Text key={code} modifiers={[tag(code)]}>
            {item(code)}
          </Text>
        ))}
      </Picker>
    </Menu>
  );
}

export function RewardSection({
  field,
  value,
  currency,
  category,
  onCurrency,
  onAmount,
  onBlur,
}: {
  field: SyncedText;
  value: string;
  currency: CurrencyCode;
  category: BountyCategory | null;
  onCurrency: (currency: CurrencyCode) => void;
  onAmount: (text: string) => void;
  onBlur: (focused: boolean) => void;
}) {
  const { t, language } = useI18n();
  const input = useRef<TextFieldRef>(null);
  const limits = rewardLimits(currency);
  const money = (major: number) =>
    formatMoney({ minor: major * 10 ** CURRENCIES[currency].minorDigits, currency }, language, {
      whole: true,
    });
  const suggestion = rewardSuggestion(category, currency);
  const range = suggestion
    ? formatMoneyRange(
        { minor: suggestion[0] * 10 ** CURRENCIES[currency].minorDigits, currency },
        { minor: suggestion[1] * 10 ** CURRENCIES[currency].minorDigits, currency },
        language,
      )
    : null;
  const typed = value.trim();
  return (
    <Section
      header={<Text>{t('bounty.post.form.reward')}</Text>}
      footer={
        <Text modifiers={[accessibilityIdentifier('bounty-post-reward-footer')]}>
          {range
            ? `${t('bounty.post.form.rewardSuggest', { range })}\n${t('bounty.post.form.rewardFooter')}`
            : t('bounty.post.form.rewardFooter')}
        </Text>
      }
    >
      <FieldRow field={input}>
        <CurrencyMenu currency={currency} onChange={onCurrency} />
        <Spacer />
        <SyncedTextField
          ref={input}
          field={field}
          maxLength={String(limits.maxMajor).length}
          placeholder="0"
          onFocusChange={onBlur}
          testID="bounty-post-reward"
          modifiers={[
            keyboardType('numeric'),
            multilineTextAlignment('trailing'),
            font({ size: vars['--text-amount-compact'], weight: 'heavy', design: 'rounded' }),
            accessibilityLabel(t('bounty.post.form.reward')),
          ]}
        />
      </FieldRow>
      <HStack spacing={vars['--space-2']} modifiers={[ROW_INSETS]}>
        {rewardAmounts(category, currency).map((major) => {
          const label = money(major);
          return (
            <Button
              key={major}
              onPress={() => onAmount(String(major))}
              testID={`bounty-post-amount-${major}`}
              modifiers={[
                buttonStyle(typed === String(major) ? 'borderedProminent' : 'bordered'),
                buttonBorderShape('capsule'),
                controlSize('regular'),
                frame({ maxWidth: Infinity }),
                accessibilityLabel(t('bounty.post.form.amountLabel', { amount: label })),
                ...(typed === String(major) ? [accessibilityAddTraits(['isSelected'])] : []),
              ]}
            >
              <Text
                modifiers={[
                  lineLimit(1),
                  frame({ maxWidth: Infinity, minHeight: CHIP_LABEL_HEIGHT }),
                ]}
              >
                {label}
              </Text>
            </Button>
          );
        })}
      </HStack>
    </Section>
  );
}
