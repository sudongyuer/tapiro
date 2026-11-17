import { HStack, Image, Text } from '@expo/ui/swift-ui';
import {
  accessibilityHidden,
  accessibilityIdentifier,
  fixedSize,
  font,
  foregroundStyle,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { vars, type TokenName } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

export type StatusLineTone = 'accepted' | 'inProgress' | 'needsYou' | 'done' | 'ended';

const SYMBOLS: Record<StatusLineTone, SFSymbol> = {
  accepted: 'circle.inset.filled',
  inProgress: 'circle.fill',
  needsYou: 'exclamationmark.circle.fill',
  done: 'checkmark.circle.fill',
  ended: 'xmark.circle',
};

const TOKENS: Record<Exclude<StatusLineTone, 'ended'>, TokenName> = {
  accepted: '--color-accent',
  inProgress: '--color-accent',
  needsYou: '--color-warning',
  done: '--color-success',
};

export function StatusLine({
  tone,
  text,
  testID,
}: {
  tone: StatusLineTone;
  text: string;
  testID: string;
}) {
  const { color } = useTheme();
  const ink =
    tone === 'ended'
      ? foregroundStyle({ type: 'hierarchical', style: 'secondary' })
      : foregroundStyle(color(TOKENS[tone]));
  return (
    <HStack spacing={vars['--space-1']} alignment="firstTextBaseline">
      <Image
        systemName={SYMBOLS[tone]}
        size={vars['--text-secondary']}
        modifiers={[ink, accessibilityHidden()]}
      />
      <Text
        modifiers={[
          font({ textStyle: 'headline' }),
          ink,
          multilineTextAlignment('center'),
          fixedSize({ horizontal: false, vertical: true }),
          accessibilityIdentifier(testID),
        ]}
      >
        {text}
      </Text>
    </HStack>
  );
}
