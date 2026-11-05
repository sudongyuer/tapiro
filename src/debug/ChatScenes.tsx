import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export function ChatThreadScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    router.push('/messages/debug-thread', { withAnchor: true });
    onReady();
  }, [router, onReady]);
  return null;
}
