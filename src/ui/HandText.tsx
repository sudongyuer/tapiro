import { PlatformColor, Text, type TextProps } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { vars } from './theme/tokens';

export type HandRole = 'caption' | 'date' | 'month';

export function handFont(language: string, role: HandRole) {
  const han = language === 'zh-Hans';
  return {
    fontFamily: han ? vars['--font-hand-han'] : vars['--font-hand-latin'],
    fontWeight: han ? ('400' as const) : ('700' as const),
    fontSize: vars[`--text-hand-${role}`],
    lineHeight: vars[`--text-hand-${role}--line-height`],
  };
}

export type HandTextProps = TextProps & { hand: HandRole };

export function HandText({ hand, style, ...rest }: HandTextProps) {
  const { language } = useI18n();
  return (
    <Text {...rest} style={[handFont(language, hand), { color: PlatformColor('label') }, style]} />
  );
}
