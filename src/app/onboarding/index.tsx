import { Stack, useRouter } from 'expo-router';

import {
  NameStep,
  accountActions,
  profileStore,
  useProfile,
  useSignedInUser,
  useSigningOut,
} from '@/features/account';
import { useI18n } from '@/lib/i18n';
import { askConfirm } from '@/ui/confirm';

export default function OnboardingName() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const signingOut = useSigningOut();
  if (!user) return null;
  const signOut = async () => {
    const sure = await askConfirm(
      {
        title: t('account.name.signOutTitle'),
        message: t('account.name.signOutMessage'),
        confirm: t('account.name.signOut'),
        keep: t('account.name.signOutKeep'),
      },
      true,
      'bar',
    );
    if (sure) await accountActions.signOut();
  };
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={t('account.name.signOut')}
          disabled={signingOut}
          onPress={() => void signOut()}
        >
          {t('account.name.signOut')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <NameStep
        user={user}
        load={profile}
        onRetry={() => void profileStore.ensureLoaded(user)}
        onSave={(next) => profileStore.save(user, next)}
        onDone={() => router.push('/onboarding/language')}
      />
    </>
  );
}
