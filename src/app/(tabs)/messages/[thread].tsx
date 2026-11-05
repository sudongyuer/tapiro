import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThreadScreen, ThreadTitle, type ThreadInfo } from '@/features/chat';

export default function Thread() {
  const router = useRouter();
  const { thread } = useLocalSearchParams<{ thread: string }>();
  const openItem = (info: ThreadInfo) =>
    info.kind === 'bounty'
      ? router.push({ pathname: '/bounty/status/[id]', params: { id: info.itemId } })
      : router.push({ pathname: '/ride/[id]', params: { id: info.itemId } });
  return (
    <>
      <ThreadTitle threadId={thread} />
      <ThreadScreen threadId={thread} onOpenItem={openItem} />
    </>
  );
}
