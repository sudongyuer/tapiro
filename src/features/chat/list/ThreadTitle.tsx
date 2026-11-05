import { Stack } from 'expo-router';

import { useI18n } from '@/lib/i18n';

import { useChatThreadInfo } from '../hooks';
import { threadTitle } from './rowView';

export function ThreadTitle({ threadId }: { threadId: string }) {
  const { t } = useI18n();
  const info = useChatThreadInfo(threadId);
  return <Stack.Screen options={{ title: info ? threadTitle(info, t) : '' }} />;
}
