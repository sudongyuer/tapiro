import { Host, VStack } from '@expo/ui/swift-ui';
import { contentShape, frame, onTapGesture, padding, shapes } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode, Ref } from 'react';
import type { AccessibilityActionEvent } from 'react-native';
import { PlatformColor, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

import { CardApplied, CardFoot, CardHead, CardWhenWhere } from './BoardCardRows';
import { cardCopy } from './cardCopy';
import type { BoardRow } from './types';

const OPEN = { name: 'activate' } as const;

export function BoardCard({
  row,
  onOpen,
  onApply,
  cardRef,
  ring,
}: {
  row: BoardRow;
  onOpen: (id: string) => void;
  onApply: (id: string) => void;
  cardRef?: Ref<View>;
  ring?: ReactNode;
}) {
  const { t, language } = useI18n();
  const copy = cardCopy(row, t, language, new Date());
  const testID = `bounty-card-${row.id}`;
  const actions = row.appliedByMe
    ? [OPEN]
    : [OPEN, { name: 'apply', label: t('bounty.board.apply') }];
  const { selected, select, highlight } = useSelectedUntilReturn();
  const open = () => {
    select();
    onOpen(row.id);
  };
  const onAction = (event: AccessibilityActionEvent) =>
    event.nativeEvent.actionName === 'apply' ? onApply(row.id) : open();

  return (
    <View
      ref={cardRef}
      accessible
      accessibilityRole="button"
      accessibilityLabel={copy.label}
      accessibilityActions={actions}
      onAccessibilityAction={onAction}
      accessibilityState={{ selected }}
      testID={testID}
      style={styles.card}
    >
      <Animated.View pointerEvents="none" style={[styles.selection, highlight]} />
      <Host matchContents={{ vertical: true }}>
        <VStack
          alignment="leading"
          spacing={vars['--space-2']}
          modifiers={[
            padding({ all: vars['--space-4'] }),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
            contentShape(shapes.rectangle()),
            onTapGesture(open),
          ]}
        >
          <CardHead row={row} copy={copy} testID={testID} />
          <CardWhenWhere urgent={row.urgent} copy={copy} testID={testID} />
          <CardFoot
            applied={row.appliedByMe}
            copy={copy}
            testID={testID}
            onApply={() => onApply(row.id)}
          />
          {row.appliedByMe ? <CardApplied testID={testID} /> : null}
        </VStack>
      </Host>
      {ring}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  selection: {
    ...StyleSheet.absoluteFill,
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    backgroundColor: PlatformColor('systemGray4'),
  },
});
