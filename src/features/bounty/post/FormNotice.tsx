import { useI18n } from '@/lib/i18n';
import { NoticeCard } from '@/ui/NoticeCard';

import { errorKey } from './errorCopy';
import type { FormNotice as Notice } from './useDraft';

export function FormNotice({ notice }: { notice: Notice | null }) {
  const { t } = useI18n();
  if (notice === null) return null;
  if (notice === 'alreadySent') {
    return (
      <NoticeCard
        tone="warning"
        icon="checkmark.circle.fill"
        title={t('bounty.post.form.alreadySent')}
        testID="bounty-post-already-sent"
      />
    );
  }
  const shown = errorKey(notice);
  return (
    <NoticeCard
      tone="urgent"
      icon="exclamationmark.circle.fill"
      title={t(shown.key, shown.values)}
      testID="bounty-post-error"
    />
  );
}
