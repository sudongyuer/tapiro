import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { MemoryScreen } from '@/features/ask';

export default function TapirMemory() {
  const router = useRouter();
  const userId = useSignedInUser()?.id ?? null;
  return (
    <MemoryScreen
      userId={userId}
      onAdd={() => router.push('/ask-memory-entry')}
      onEdit={(id) => router.push({ pathname: '/ask-memory-entry', params: { id } })}
    />
  );
}
