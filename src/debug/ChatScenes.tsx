import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { FIXTURE_LONG_THREAD_ID } from '@/features/chat';

export function ChatThreadScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    router.push(
      { pathname: '/messages/[thread]', params: { thread: FIXTURE_LONG_THREAD_ID } },
      { withAnchor: true },
    );
    onReady();
  }, [router, onReady]);
  return null;
}
