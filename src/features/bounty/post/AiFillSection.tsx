import { Button, HStack, Section, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  accessibilityLabel,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import { fullRow, ROW_INSETS } from '@/ui/FieldRow';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { AiFill } from './aiFill';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const footnote = font({ textStyle: 'footnote' });

export function AiFillSection({ fill, onUndo }: { fill: AiFill; onUndo: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  const count = fill.rows.length;
  const lines = [
    ...fill.dropped.map(({ field, kept }) => ({
      id: `bounty-post-ai-dropped-${field}`,
      text: t(`bounty.post.aiFill.${field}${kept ? 'Kept' : 'Empty'}`),
    })),
    ...(fill.placeHint
      ? [
          {
            id: 'bounty-post-ai-place',
            text: t('bounty.post.aiFill.place', { place: fill.placeHint }),
          },
        ]
      : []),
  ];
  return (
    <Section>
      <HStack spacing={vars['--space-2']} modifiers={[fullRow, ROW_INSETS]}>
        <Text modifiers={[accessibilityIdentifier('bounty-post-ai-filled')]}>
          {count > 0 ? t('bounty.post.aiFill.filled', { count }) : t('bounty.post.aiFill.none')}
        </Text>
        <Spacer />
        {count > 0 ? (
          <Button
            onPress={onUndo}
            testID="bounty-post-ai-undo"
            modifiers={[
              buttonStyle('borderless'),
              accessibilityLabel(t('bounty.post.aiFill.undoLabel', { count })),
            ]}
          >
            <Text
              modifiers={[
                foregroundStyle(color('--color-accent')),
                font({ textStyle: 'body', weight: 'semibold' }),
                frame({
                  minWidth: vars['--touch-min'],
                  minHeight: vars['--touch-min'],
                  alignment: 'trailing',
                }),
                contentShape(shapes.rectangle()),
              ]}
            >
              {t('bounty.post.aiFill.undo')}
            </Text>
          </Button>
        ) : null}
      </HStack>
      {lines.length > 0 ? (
        <VStack alignment="leading" spacing={vars['--space-2']} modifiers={[fullRow, ROW_INSETS]}>
          {lines.map((line) => (
            <Text key={line.id} modifiers={[footnote, secondary, accessibilityIdentifier(line.id)]}>
              {line.text}
            </Text>
          ))}
        </VStack>
      ) : null}
    </Section>
  );
}
