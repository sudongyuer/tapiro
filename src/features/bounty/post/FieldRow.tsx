import { HStack, type TextFieldRef } from '@expo/ui/swift-ui';
import {
  contentShape,
  frame,
  listRowInsets,
  onTapGesture,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode, RefObject } from 'react';

import { vars } from '@/ui/theme/tokens';

export const ROW_INSETS = listRowInsets({
  top: vars['--space-1'],
  bottom: vars['--space-1'],
  leading: vars['--space-4'],
  trailing: vars['--space-4'],
});

export const fullRow = frame({
  maxWidth: Infinity,
  minHeight: vars['--touch-min'],
  alignment: 'leading',
});

// A SwiftUI TextField only takes focus inside its own 22 pt text frame; the row focuses it so the target is 44 pt.
export function FieldRow({
  field,
  children,
}: {
  field: RefObject<TextFieldRef | null>;
  children: ReactNode;
}) {
  return (
    <HStack
      modifiers={[
        fullRow,
        contentShape(shapes.rectangle()),
        onTapGesture(() => {
          field.current?.focus();
        }),
        ROW_INSETS,
      ]}
    >
      {children}
    </HStack>
  );
}
