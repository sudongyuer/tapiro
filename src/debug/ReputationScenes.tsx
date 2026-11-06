import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { profileHref, type ProfileTab } from '@/features/reputation';
import { uiVerifyArgument } from '@/lib/uiVerify';

const TABS: readonly ProfileTab[] = ['bounty', 'messages', 'ride', 'me'];

export function ProfileScene({ onReady }: { onReady: () => void }) {
  const router = useRouter();
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    const asked = uiVerifyArgument('uiVerifyProfileTab');
    const tab = TABS.find((one) => one === asked) ?? 'bounty';
    const person = uiVerifyArgument('uiVerifyProfilePerson') ?? 'fixture-person-mei';
    router.push(profileHref(tab, person), { withAnchor: true });
    onReady();
  }, [router, onReady]);
  return null;
}
