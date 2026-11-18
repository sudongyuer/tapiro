import { Button, Section } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n';
import { afterResign } from '@/ui/afterResign';
import { ConfirmDialog } from '@/ui/ConfirmDialog';
import { useTheme } from '@/ui/theme/useTheme';

import { fullRow, ROW_INSETS } from '@/ui/FieldRow';
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
      <ConfirmDialog
        copy={{
          title: t('bounty.post.form.clearConfirm.title'),
          message: t('bounty.post.form.clearConfirm.message'),
          confirm: t('bounty.post.form.clearConfirm.confirm'),
          keep: t('bounty.post.form.clearConfirm.cancel'),
        }}
        destructive
        presented={asking}
        onPresentedChange={setAsking}
        onConfirm={afterResign(() => {
          resetDraft(userId);
          onCleared();
        })}
      >
        <Button
          label={t('bounty.post.form.clear')}
          role="destructive"
          onPress={() => setAsking(true)}
          testID="bounty-post-clear"
          modifiers={[foregroundStyle(color('--color-urgent')), fullRow, ROW_INSETS]}
        />
      </ConfirmDialog>
    </Section>
  );
}
