import { useLocalSearchParams, useRouter } from 'expo-router';

import { AskTapirSheet, isShellTab } from '@/features/shell';

export default function Ask() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <AskTapirSheet tab={isShellTab(tab) ? tab : 'bounty'} onClose={() => router.back()} />;
}
