import { LanguageStep, accountActions, useSignedInUser } from '@/features/account';
import { notices } from '@/lib/notifications';

export default function OnboardingLanguage() {
  const user = useSignedInUser();
  const done = () => {
    if (!user) return;
    accountActions.finishOnboarding(user.id);
    void notices.askProvisional();
  };
  return <LanguageStep onDone={done} />;
}
