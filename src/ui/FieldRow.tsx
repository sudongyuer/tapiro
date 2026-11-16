import { HStack, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  alignmentGuide,
  contentShape,
  frame,
  listRowInsets,
  onTapGesture,
  shapes,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode, RefObject } from 'react';

import { vars } from '@/ui/theme/tokens';

export const ROW_INSETS = listRowInsets({
  top: vars['--space-1'],
  bottom: vars['--space-1'],
  leading: vars['--space-5'],
  trailing: vars['--space-5'],
});

// SwiftUI starts a row's separator at the row's first Text; a row that leads with a field or a button would
// get a hairline starting at a counter or a chip label.
export const edgeSeparator = alignmentGuide('listRowSeparatorLeading', 0);

export const fullRow = frame({
  maxWidth: Infinity,
  minHeight: vars['--touch-min'],
  alignment: 'leading',
});

// A SwiftUI TextField only takes focus inside its own 22 pt text frame; the row focuses it so the target is 44 pt.
export function FieldRow({
  field,
  children,
  modifiers = [],
}: {
  field: RefObject<TextFieldRef | null>;
  children: ReactNode;
  modifiers?: ModifierConfig[];
}) {
  return (
    <HStack
      spacing={0}
      modifiers={[
        fullRow,
        contentShape(shapes.rectangle()),
        onTapGesture(() => {
          field.current?.focus();
        }),
        ROW_INSETS,
        edgeSeparator,
        ...modifiers,
      ]}
    >
      {children}
    </HStack>
  );
}
