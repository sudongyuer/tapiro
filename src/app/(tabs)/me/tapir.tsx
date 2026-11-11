import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { TapirSettingsScreen } from '@/features/ask';

export default function Tapir() {
  const router = useRouter();
  const userId = useSignedInUser()?.id ?? null;
  return (
    <TapirSettingsScreen
      userId={userId}
      onOpenConsent={() => router.push({ pathname: '/ask-consent', params: { from: 'me' } })}
    />
  );
}
