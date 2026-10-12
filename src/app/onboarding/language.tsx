import { LanguageStep, accountActions, useSignedInUser } from '@/features/account';

export default function OnboardingLanguage() {
  const user = useSignedInUser();
  return <LanguageStep onDone={() => user && accountActions.finishOnboarding(user.id)} />;
}
