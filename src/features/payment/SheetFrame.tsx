import { Form, Host } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

const ActionSlot = createContext<(actions: ReactNode) => void>(() => undefined);

export function SheetActions({ children }: { children: ReactNode }) {
  const place = useContext(ActionSlot);
  useLayoutEffect(() => place(children), [place, children]);
  useLayoutEffect(() => () => place(null), [place]);
  return null;
}

export function SheetFrame({ notice, children }: { notice?: ReactNode; children: ReactNode }) {
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <ActionSlot.Provider value={setActions}>
      <Host style={styles.form} testID="pay-sheet">
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
    </ActionSlot.Provider>
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
