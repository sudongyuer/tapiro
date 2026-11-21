import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useSignedInUser } from '@/features/account';
import { useMessageTranslator } from '@/features/ask';
import { ThreadScreen, ThreadTitle, type ThreadInfo } from '@/features/chat';
import { profileHref } from '@/features/reputation';
import { useAiOffered } from '@/lib/storefront';

export default function Thread() {
  return <ThreadRoute overTabs={false} />;
}

export function ThreadRoute({ overTabs }: { overTabs: boolean }) {
  const router = useRouter();
  const { thread, from } = useLocalSearchParams<{ thread: string; from?: string }>();
  const userId = useSignedInUser()?.id ?? null;
  const translator = useMessageTranslator(useAiOffered() ? userId : null, {
    consent: () => router.push({ pathname: '/ask-consent', params: { from: 'chat' } }),
    sheet: () => router.push({ pathname: '/ask', params: { tab: 'messages', via: 'translate' } }),
  });
  const openItem = (info: ThreadInfo) => {
    if (from === 'item') return router.back();
    const params = { id: info.itemId, from: 'thread' };
    return info.kind === 'bounty'
      ? router.push({ pathname: '/bounty-status/[id]', params })
      : router.push({ pathname: '/ride-detail/[id]', params });
  };
  const report = useCallback(
    (target: { userId: string; messageId: string | null }) =>
      router.push({
        pathname: overTabs ? '/chat/report' : '/messages/report',
        params: { thread, user: target.userId, message: target.messageId ?? '' },
      }),
    [router, thread, overTabs],
  );
  return (
    <>
      <ThreadTitle
        threadId={thread}
        onOpenProfile={(person) =>
          router.push(profileHref(overTabs ? 'overTabs' : 'messages', person))
        }
      />
      <ThreadScreen
        threadId={thread}
        onOpenItem={openItem}
        onReport={report}
        translator={translator}
      />
    </>
  );
}
