import {
  BottomSheet,
  Button,
  Form,
  Group,
  Host,
  NavigationStack,
  Toolbar,
  ToolbarItem,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  disabled,
  navigationBarTitleDisplayMode,
  navigationTitle,
  presentationDetents,
  presentationDragIndicator,
  scrollDismissesKeyboard,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

export function SheetShell({
  open,
  title,
  confirm,
  confirmDisabled = false,
  large = false,
  testID,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  confirm: string;
  confirmDisabled?: boolean;
  large?: boolean;
  testID: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host matchContents style={styles.anchor}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents(large ? ['medium', 'large'] : ['medium']),
            presentationDragIndicator('visible'),
          ]}
        >
          {open ? (
            <NavigationStack>
              <Toolbar>
                <Form
                  modifiers={[
                    tint(color('--color-accent')),
                    scrollDismissesKeyboard('immediately'),
                    navigationTitle(title),
                    navigationBarTitleDisplayMode('inline'),
                    accessibilityIdentifier(testID),
                  ]}
                >
                  {children}
                </Form>
                <Toolbar.Content>
                  <ToolbarItem placement="cancellationAction">
                    <Button
                      label={t('ride.detail.sheet.cancel')}
                      onPress={onClose}
                      modifiers={[accessibilityIdentifier(`${testID}-cancel`)]}
                    />
                  </ToolbarItem>
                  <ToolbarItem placement="confirmationAction">
                    <Button
                      label={confirm}
                      onPress={onConfirm}
                      modifiers={[
                        disabled(confirmDisabled),
                        accessibilityIdentifier(`${testID}-confirm`),
                      ]}
                    />
                  </ToolbarItem>
                </Toolbar.Content>
              </Toolbar>
            </NavigationStack>
          ) : null}
        </Group>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0 },
});
