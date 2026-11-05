import { useLocalSearchParams, useRouter } from 'expo-router';

import { ReportSheet } from '@/features/chat';

export default function Report() {
  const router = useRouter();
  const { thread, user, message } = useLocalSearchParams<{
    thread: string;
    user: string;
    message?: string;
  }>();
  if (!thread || !user) return null;
  return (
    <ReportSheet
      threadId={thread}
      userId={user}
      messageId={message || null}
      onClose={() => router.back()}
    />
  );
}
