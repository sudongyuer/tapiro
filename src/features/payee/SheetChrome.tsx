import { Button, Section } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

export function SheetChrome({
  title,
  onClose,
  onSave,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel={t('payee.close')}
          onPress={onClose}
        />
      </Stack.Toolbar>
      {onSave ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="checkmark"
            variant="prominent"
            tintColor={color('--color-accent')}
            accessibilityLabel={t('payee.save')}
            onPress={onSave}
          />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}

export function EditActions({
  isDefault,
  onMakeDefault,
  onDelete,
}: {
  isDefault: boolean;
  onMakeDefault: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Section>
      {isDefault ? null : (
        <Button
          label={t('payee.makeDefault')}
          onPress={onMakeDefault}
          testID="payee-make-default"
          modifiers={[foregroundStyle(color('--color-accent'))]}
        />
      )}
      <Button
        label={t('payee.deleteMethod')}
        role="destructive"
        onPress={onDelete}
        testID="payee-delete"
        modifiers={[foregroundStyle(color('--color-urgent'))]}
      />
    </Section>
  );
}
