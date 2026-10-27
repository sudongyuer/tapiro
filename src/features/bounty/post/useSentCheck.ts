import { useEffect, useState } from 'react';

import { checkSentDraft } from './sentDraft';
import { draftStore, postService } from './services';
import type { PostDraft } from './types';
import { formError, resetDraft } from './useDraft';

export function useSentCheck(userId: string, draft: PostDraft) {
  const [opened] = useState(draft);
  useEffect(() => {
    checkSentDraft({
      draft: opened,
      isEmpty: draftStore.isEmpty,
      isPublished: (id) => postService.isPublished(id),
      stillCurrent: (id) => draftStore.load(userId).id === id,
      onSent: () => {
        resetDraft(userId);
        formError.set('alreadySent');
      },
    });
  }, [userId, opened]);
}
