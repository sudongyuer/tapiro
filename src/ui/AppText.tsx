import { PlatformColor, StyleSheet, Text, type TextProps } from 'react-native';

import { typeStyle, vars, type TypeRole } from './theme/tokens';

type Tone = 'label' | 'secondaryLabel' | 'tertiaryLabel';

const WEIGHTS: Record<TypeRole, '400' | '600' | '700' | '800'> = {
  amount: '800',
  'amount-compact': '800',
  'large-title': '700',
  'moment-title': '800',
  reward: '800',
  title: '600',
  body: '400',
  secondary: '400',
  meta: '400',
};

export type AppTextProps = TextProps & {
  variant: TypeRole;
  tone?: Tone;
};

export function AppText({ variant, tone = 'label', style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typeStyle(variant),
        { fontWeight: WEIGHTS[variant], color: PlatformColor(tone) },
        (variant === 'reward' || variant === 'amount' || variant === 'amount-compact') &&
          styles.rounded,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  rounded: { fontFamily: vars['--font-rounded'], fontVariant: ['tabular-nums'] },
});
