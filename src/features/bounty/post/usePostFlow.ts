import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { markArrival } from '@/lib/handArt';

import { createPostFlow, type PublishHandlers } from './postFlow';
import { draftStore, postService } from './services';
import { resetDraft } from './useDraft';

export function usePostFlow(userId: string, handlers: PublishHandlers) {
  const [flow] = useState(() =>
    createPostFlow({
      service: postService,
      draft: () => draftStore.load(userId),
      clearDraft: () => resetDraft(userId),
      now: () => new Date(),
    }),
  );
  useEffect(() => {
    flow.load();
  }, [flow]);
  const state = useSyncExternalStore(flow.subscribe, flow.get);
  const publish = () =>
    flow.publish({
      onPublished: (result) => {
        markArrival(result.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handlers.onPublished(result);
      },
      onInvalid: handlers.onInvalid,
      onAlreadySent: handlers.onAlreadySent,
    });
  return { state, publish, retry: flow.load };
}
