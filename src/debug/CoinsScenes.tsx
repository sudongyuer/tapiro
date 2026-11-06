import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

export function CoinsPageScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    router.push('/me/coins', { withAnchor: true });
    onReady();
  }, [router, onReady]);
  return null;
}
