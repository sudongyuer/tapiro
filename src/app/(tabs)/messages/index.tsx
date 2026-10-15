import { EmptyTab } from '@/features/shell';
import { useI18n } from '@/lib/i18n';

export default function Messages() {
  const { t } = useI18n();
  return (
    <EmptyTab
      symbol="bubble.left.and.bubble.right"
      title={t('shell.messages.emptyTitle')}
      description={t('shell.messages.emptyBody')}
      testID="messages-empty"
    />
  );
}
