import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onReturnToForeground } from '@/lib/foreground';
import { useI18n } from '@/lib/i18n';
import { permissionAnswers } from '@/lib/notifications';
import { uiVerify } from '@/lib/uiVerify';

import { pushRegistration } from './instance';

export function usePushRegistration(userId: string | null) {
  const { language } = useI18n();
  useEffect(() => {
    if (!userId) return;
    const sync = () => void pushRegistration.sync(userId, language);
    sync();
    const offAnswers = permissionAnswers.subscribe(sync);
    const appState = onReturnToForeground(AppState, () => sync());
    const tokens = uiVerify ? null : Notifications.addPushTokenListener(sync);
    return () => {
      offAnswers();
      appState();
      tokens?.remove();
    };
  }, [userId, language]);
}
