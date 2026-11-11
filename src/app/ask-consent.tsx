import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConsentScreen } from '@/features/ask';

export default function AskConsent() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <ConsentScreen
      from={from === 'me' ? 'me' : 'sheet'}
      onDone={() => router.back()}
      onOpenPrivacy={() => router.push('/legal/privacy')}
    />
  );
}
