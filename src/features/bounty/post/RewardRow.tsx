import { HStack, Image, Menu, Picker, Spacer, Text, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonStyle,
  contentShape,
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
import { CURRENCIES, CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from '@/lib/money';
import { SyncedTextField, type SyncedText } from '@/ui/SyncedTextField';
import { vars } from '@/ui/theme/tokens';

import { FieldRow } from './FieldRow';
import { rewardLimits } from './validate';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const REWARD_FIELD_WIDTH = 96;

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

export function RewardRow({
  field,
  currency,
  onCurrency,
  onBlur,
}: {
  field: SyncedText;
  currency: CurrencyCode;
  onCurrency: (currency: CurrencyCode) => void;
  onBlur: (focused: boolean) => void;
}) {
  const { t } = useI18n();
  const input = useRef<TextFieldRef>(null);
  const limits = rewardLimits(currency);
  return (
    <FieldRow field={input}>
      <Text>{t('bounty.post.form.reward')}</Text>
      <Spacer />
      <CurrencyMenu currency={currency} onChange={onCurrency} />
      <SyncedTextField
        ref={input}
        field={field}
        maxLength={String(limits.maxMajor).length}
        placeholder={t('bounty.post.form.rewardPlaceholder', {
          min: limits.minMajor,
          max: limits.maxMajor,
        })}
        onFocusChange={onBlur}
        testID="bounty-post-reward"
        modifiers={[
          keyboardType('numeric'),
          multilineTextAlignment('trailing'),
          frame({ width: REWARD_FIELD_WIDTH }),
          accessibilityLabel(t('bounty.post.form.reward')),
        ]}
      />
    </FieldRow>
  );
}
