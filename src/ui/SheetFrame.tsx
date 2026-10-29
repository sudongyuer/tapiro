import { Form, Host, RNHostView } from '@expo/ui/swift-ui';
import { refreshable, tint } from '@expo/ui/swift-ui/modifiers';
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { PinnedBar } from 'tapiro-kit';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

const VIEW_BOTTOM = { bottom: 'additive' } as const;

export function SheetFrame({
  notice,
  testID,
  pinnedAbove = 'homeIndicator',
  scrollsUnderActions = false,
  onRefresh,
  children,
}: {
  notice?: ReactNode;
  testID: string;
  pinnedAbove?: 'homeIndicator' | 'tabBar';
  scrollsUnderActions?: boolean;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
}) {
  const { color } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [actions, setActions] = useState<ReactNode>(null);
  const [layers, setLayers] = useState<ReactNode>(null);
  const [slots] = useState<Slots>(() => ({ actions: setActions, layers: setLayers }));
  const below = actions !== null && !scrollsUnderActions;
  const form = (
    <Form
      modifiers={[tint(color('--color-accent')), ...(onRefresh ? [refreshable(onRefresh)] : [])]}
    >
      {notice}
      {children}
    </Form>
  );
  return (
    <SlotContext.Provider value={slots}>
      <Host style={styles.form} testID={testID}>
        {scrollsUnderActions ? (
          <PinnedBar>
            {form}
            {actions ? (
              <RNHostView matchContents={{ vertical: true }}>
                <View style={[styles.actions, styles.bar]}>{actions}</View>
              </RNHostView>
            ) : null}
          </PinnedBar>
        ) : (
          form
        )}
      </Host>
      {below && pinnedAbove === 'tabBar' ? (
        // The window inset leaves out the tab bar and its accessory; the view's own safe area includes both.
        <SafeAreaView edges={VIEW_BOTTOM} style={[styles.actions, styles.below, styles.inTab]}>
          {actions}
        </SafeAreaView>
      ) : below ? (
        <View style={[styles.actions, styles.below, { paddingBottom: bottom + vars['--space-2'] }]}>
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
    paddingHorizontal: vars['--space-6'],
    paddingTop: vars['--space-2'],
    gap: vars['--space-1'],
  },
  below: { backgroundColor: PlatformColor('systemGroupedBackground') },
  bar: { paddingBottom: vars['--space-2'] },
  inTab: { paddingBottom: vars['--space-2'] },
});
