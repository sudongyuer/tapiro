import { Stack, useRouter } from 'expo-router';

import {
  NameStep,
  accountActions,
  profileStore,
  useProfile,
  useSignedInUser,
} from '@/features/account';
import { useI18n } from '@/lib/i18n';

export default function OnboardingName() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  if (!user) return null;
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel={t('account.name.signOut')}
          onPress={accountActions.signOut}
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
