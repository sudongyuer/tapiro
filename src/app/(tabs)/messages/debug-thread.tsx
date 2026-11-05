import { Redirect, Stack } from 'expo-router';

import { FIXTURE_LONG_THREAD_ID, ThreadScreen } from '@/features/chat';
import { useI18n } from '@/lib/i18n';
import { debugToolsEnabled } from '@/lib/uiVerify';

export default function DebugThread() {
  const { t } = useI18n();
  if (!debugToolsEnabled) return <Redirect href="/" />;
  return (
    <>
      <Stack.Screen options={{ title: t('debug.chat.thread') }} />
      <ThreadScreen threadId={FIXTURE_LONG_THREAD_ID} />
    </>
  );
}
