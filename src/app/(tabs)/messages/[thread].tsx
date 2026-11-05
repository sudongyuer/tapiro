import { useLocalSearchParams } from 'expo-router';

import { ThreadScreen, ThreadTitle } from '@/features/chat';

export default function Thread() {
  const { thread } = useLocalSearchParams<{ thread: string }>();
  return (
    <>
      <ThreadTitle threadId={thread} />
      <ThreadScreen threadId={thread} />
    </>
  );
}
