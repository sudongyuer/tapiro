import { Button, ConfirmationDialog, Section, Text } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/ui/theme/useTheme';

import { fullRow, ROW_INSETS } from './FieldRow';
import { resetDraft } from './useDraft';

export function ClearSection({
  userId,
  empty,
  onCleared,
}: {
  userId: string;
  empty: boolean;
  onCleared: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const [asking, setAsking] = useState(false);
  if (empty) return null;
  return (
    <Section>
      <ConfirmationDialog
        title={t('bounty.post.form.clearConfirm.title')}
        titleVisibility="visible"
        isPresented={asking}
        onIsPresentedChange={setAsking}
      >
        <ConfirmationDialog.Trigger>
          <Button
            label={t('bounty.post.form.clear')}
            role="destructive"
            onPress={() => setAsking(true)}
            testID="bounty-post-clear"
            modifiers={[foregroundStyle(color('--color-urgent')), fullRow, ROW_INSETS]}
          />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button
            label={t('bounty.post.form.clearConfirm.confirm')}
            role="destructive"
            onPress={() => {
              resetDraft(userId);
              onCleared();
            }}
          />
          <Button label={t('bounty.post.form.clearConfirm.cancel')} role="cancel" />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{t('bounty.post.form.clearConfirm.message')}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Section>
  );
}
