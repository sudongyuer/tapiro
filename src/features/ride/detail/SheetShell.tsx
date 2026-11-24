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
import { keyboardDone } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import { useTheme } from '@/ui/theme/useTheme';

export function SheetShell({
  open,
  title,
  confirm,
  confirmDisabled = false,
  large = false,
  testID,
  onConfirm: confirmTapped,
  onClose: closed,
  onDismiss,
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
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const onConfirm = afterResign(confirmTapped);
  const onClose = afterResign(closed);
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host matchContents style={styles.anchor}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
        onDismiss={onDismiss}
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
                    keyboardDone(t('keyboard.done')),
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
