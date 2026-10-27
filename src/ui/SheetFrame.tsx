import { Form, Host } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

type Slots = { actions: (node: ReactNode) => void; layers: (node: ReactNode) => void };

const SlotContext = createContext<Slots | null>(null);

function useSlot(name: keyof Slots, children: ReactNode) {
  const slots = useContext(SlotContext);
  if (!slots)
    throw new Error(
      `Sheet${name === 'actions' ? 'Actions' : 'Layer'} must render inside SheetFrame`,
    );
  const place = slots[name];
  useLayoutEffect(() => place(children), [place, children]);
  useLayoutEffect(() => () => place(null), [place]);
}

export function SheetActions({ children }: { children: ReactNode }) {
  useSlot('actions', children);
  return null;
}

// A Modal declared among the Form rows stopped presenting once the pinned actions bar shortened the Form
// (cause inside SwiftUI unconfirmed); modals mount outside the Host through this slot.
export function SheetLayer({ children }: { children: ReactNode }) {
  useSlot('layers', children);
  return null;
}

export function SheetFrame({
  notice,
  testID,
  children,
}: {
  notice?: ReactNode;
  testID: string;
  children: ReactNode;
}) {
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [actions, setActions] = useState<ReactNode>(null);
  const [layers, setLayers] = useState<ReactNode>(null);
  const [slots] = useState<Slots>(() => ({ actions: setActions, layers: setLayers }));
  return (
    <SlotContext.Provider value={slots}>
      <Host style={styles.form} testID={testID}>
        <Form modifiers={[tint(color('--color-accent'))]}>
          {notice}
          {children}
        </Form>
      </Host>
      {actions ? (
        <View style={[styles.actions, { paddingBottom: bottom + vars['--space-2'] }]}>
          {actions}
        </View>
      ) : null}
      {layers}
    </SlotContext.Provider>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1 },
  actions: {
    backgroundColor: PlatformColor('systemGroupedBackground'),
    paddingHorizontal: vars['--space-6'],
    paddingTop: vars['--space-2'],
    gap: vars['--space-1'],
  },
});
