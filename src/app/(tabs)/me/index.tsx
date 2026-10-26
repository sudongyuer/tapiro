import { useRouter } from 'expo-router';

import { MeView, useProfile, useSignedInUser } from '@/features/account';
import { usePayeeRecheckDue } from '@/features/payee';
import { useStickers } from '@/lib/stickers';

export default function Me() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const ready = profile.status === 'ready' ? profile.profile : null;
  const payeeDue = usePayeeRecheckDue(user?.id ?? null);
  const stickers = useStickers(user?.id ?? null);
  return (
    <MeView
      name={ready?.displayName ?? user?.name ?? ''}
      avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      payeeDue={payeeDue}
      stickerCount={stickers.status === 'ready' ? stickers.stickers.length : null}
      onOpenStickers={() => router.push('/me/stickers')}
      onOpenPayee={() => router.push('/me/payee')}
      onOpenSettings={() => router.push('/me/settings')}
    />
  );
}
