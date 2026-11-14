import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { MemoryEntrySheet } from '@/features/ask';

export default function AskMemoryEntry() {
  const router = useRouter();
  const user = useSignedInUser();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!user) return null;
  return <MemoryEntrySheet userId={user.id} entryId={id ?? null} onDone={() => router.back()} />;
}
