import { requireNativeView } from 'expo';
import { createModifier, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';

export const navigationScrollEdge = () => createModifier('tapiroNavigationScrollEdge');

export const keyboardDone = (label: string) => createModifier('tapiroKeyboardDone', { label });

const NativeChipRow = requireNativeView<{
  spacing: number;
  modifiers: ModifierConfig[];
  children: ReactNode;
}>('TapiroKit', 'ChipRowView');

export function ChipRow({
  spacing,
  modifiers = [],
  children,
}: {
  spacing: number;
  modifiers?: ModifierConfig[];
  children: ReactNode;
}) {
  return (
    <NativeChipRow spacing={spacing} modifiers={modifiers}>
      {children}
    </NativeChipRow>
  );
}
