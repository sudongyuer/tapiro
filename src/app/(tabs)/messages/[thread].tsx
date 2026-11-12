import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useSignedInUser } from '@/features/account';
import { useMessageTranslator } from '@/features/ask';
import { ThreadScreen, ThreadTitle, type ThreadInfo } from '@/features/chat';
import { profileHref } from '@/features/reputation';

export default function Thread() {
  const router = useRouter();
  const { thread } = useLocalSearchParams<{ thread: string }>();
  const translator = useMessageTranslator(useSignedInUser()?.id ?? null, {
    consent: () => router.push({ pathname: '/ask-consent', params: { from: 'chat' } }),
    sheet: () => router.push({ pathname: '/ask', params: { tab: 'messages' } }),
  });
  const openItem = (info: ThreadInfo) =>
    info.kind === 'bounty'
      ? router.push({ pathname: '/bounty/status/[id]', params: { id: info.itemId } })
      : router.push({ pathname: '/ride/[id]', params: { id: info.itemId } });
  const report = useCallback(
    (target: { userId: string; messageId: string | null }) =>
      router.push({
        pathname: '/messages/report',
        params: { thread, user: target.userId, message: target.messageId ?? '' },
      }),
    [router, thread],
  );
  return (
    <>
      <ThreadTitle
        threadId={thread}
        onOpenProfile={(person) => router.push(profileHref('messages', person))}
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
