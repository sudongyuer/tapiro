import { useRouter } from 'expo-router';

import { ChatListScreen } from '@/features/chat';

export default function Messages() {
  const router = useRouter();
  return (
    <ChatListScreen
      onOpen={(thread) => router.push({ pathname: '/messages/[thread]', params: { thread } })}
      onBrowse={() => router.navigate('/bounty')}
    />
  );
}
