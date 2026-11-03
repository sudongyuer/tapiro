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

export default function OnboardingName() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  const signingOut = useSigningOut();
  if (!user) return null;
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={t('account.name.signOut')}
          disabled={signingOut}
          onPress={() => void accountActions.signOut()}
        >
          {t('account.name.signOut')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <NameStep
        user={user}
        profile={profile.status === 'ready' ? profile.profile : null}
        onSave={(next) => profileStore.save(user, next)}
        onDone={() => router.push('/onboarding/language')}
      />
    </>
  );
}
