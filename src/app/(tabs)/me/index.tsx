import { useRouter } from 'expo-router';

import { MeView, useProfile, useSignedInUser } from '@/features/account';
import { coinCount, useCoinBalance, useCoinsReadFailed } from '@/features/coins';
import { usePayeeRecheckDue } from '@/features/payee';
import { profileHref, useMyStanding } from '@/features/reputation';
import { useI18n } from '@/lib/i18n';
import { useStickers } from '@/lib/stickers';
import { useAiOffered } from '@/lib/storefront';

export default function Me() {
  const router = useRouter();
  const aiOffered = useAiOffered();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const ready = profile.status === 'ready' ? profile.profile : null;
  const standing = useMyStanding(user?.id ?? null);
  const payeeDue = usePayeeRecheckDue(user?.id ?? null);
  const stickers = useStickers(user?.id ?? null);
  const balance = useCoinBalance();
  const { language } = useI18n();
  const balanceFailed = useCoinsReadFailed('balance');
  const coins =
    balance.status === 'idle' || !balance.data || balanceFailed ? null : balance.data.coins;
  return (
    <MeView
      name={ready?.displayName ?? user?.name ?? ''}
      avatarUrl={ready?.avatarUrl ?? user?.avatarUrl ?? null}
      standing={standing}
      payeeDue={payeeDue}
      stickerCount={stickers.status === 'ready' ? stickers.stickers.length : null}
      onOpenProfile={user ? () => router.push(profileHref('me', user.id)) : null}
      onOpenStickers={() => router.push('/me/stickers')}
      coinCount={coins === null ? null : coinCount(coins, language)}
      onOpenCoins={() => router.push('/me/coins')}
      onOpenInvite={() => router.push('/me/invite')}
      onOpenTapir={aiOffered ? () => router.push('/me/tapir') : null}
      onOpenPayee={() => router.push('/me/payee')}
      onOpenBlocked={() => router.push('/me/blocked')}
      onOpenSettings={() => router.push('/me/settings')}
    />
  );
}
