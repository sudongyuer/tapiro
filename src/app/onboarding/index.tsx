import { useRouter } from 'expo-router';

import { NameStep, profileStore, useProfile, useSignedInUser } from '@/features/account';

export default function OnboardingName() {
  const router = useRouter();
  const user = useSignedInUser();
  const profile = useProfile(user);
  if (!user) return null;
  return (
    <NameStep
      user={user}
      profile={profile.status === 'ready' ? profile.profile : null}
      onSave={(next) => profileStore.save(user, next)}
      onDone={() => router.push('/onboarding/language')}
    />
  );
}
