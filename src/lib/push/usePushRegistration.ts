import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

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
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    const tokens = uiVerify ? null : Notifications.addPushTokenListener(sync);
    return () => {
      offAnswers();
      appState.remove();
      tokens?.remove();
    };
  }, [userId, language]);
}
