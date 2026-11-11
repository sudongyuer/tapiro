import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

function usePushOnce(path: '/me/coins' | '/me/invite' | '/me/tapir', onReady: () => void) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    router.push(path, { withAnchor: true });
    onReady();
  }, [router, path, onReady]);
}

export function CoinsPageScene({ onReady }: { onReady: () => void }) {
  usePushOnce('/me/coins', onReady);
  return null;
}

export function InvitePageScene({ onReady }: { onReady: () => void }) {
  usePushOnce('/me/invite', onReady);
  return null;
}

export function TapirSettingsScene({ onReady }: { onReady: () => void }) {
  usePushOnce('/me/tapir', onReady);
  return null;
}
