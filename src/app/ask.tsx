import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useSignedInUser } from '@/features/account';
import { composerNoteKey, useAskComposer, useConsentFor } from '@/features/ask';
import { AskTapirSheet, isShellTab } from '@/features/shell';
import { useI18n } from '@/lib/i18n';

export default function Ask() {
  const router = useRouter();
  const { t } = useI18n();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const userId = useSignedInUser()?.id ?? null;
  useConsentFor(userId);
  const openConsent = useCallback(
    () => router.push({ pathname: '/ask-consent', params: { from: 'sheet' } }),
    [router],
  );
  const composer = useAskComposer(userId, openConsent);
  const note = composerNoteKey(composer.note);
  return (
    <AskTapirSheet
      tab={isShellTab(tab) ? tab : 'bounty'}
      onClose={() => router.back()}
      composer={{
        text: composer.text,
        onChangeText: composer.setText,
        onSend: () => void composer.send(),
        checking: composer.checking,
        note: note ? t(note) : null,
      }}
    />
  );
}
