import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { Settings } from 'react-native';

import { notices } from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';
import { uiVerify } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createDeviceToken, type DeviceToken } from './deviceToken';
import { createPushRegistration, type PushRpc } from './pushRegistration';

const STORED_KEY = 'tapiro.pushToken';
const VERIFY_CALLS_KEY = 'uiVerifyPushCalls';
const VERIFY_TOKEN: DeviceToken = { token: 'f0'.repeat(32), environment: 'sandbox' };

const deviceToken = createDeviceToken({
  device: () => Notifications.getDevicePushTokenAsync(),
  entitlement: () => Application.getIosPushNotificationServiceEnvironmentAsync(),
  development: __DEV__,
});

function supabaseRpc(): PushRpc {
  const call = async (name: string, args: Record<string, string>) => {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.rpc(name, args);
    if (error) throw error;
  };
  return {
    register: (token, language, environment) =>
      call('register_push_token', { token, language, environment }),
    unregister: (token) => call('unregister_push_token', { token }),
  };
}

function verifyRpc(): PushRpc {
  Settings.set({ [VERIFY_CALLS_KEY]: '[]' });
  const calls: unknown[] = [];
  const record = async (name: string, args: Record<string, string>) => {
    calls.push({ name, args });
    Settings.set({ [VERIFY_CALLS_KEY]: JSON.stringify(calls) });
  };
  return {
    register: (token, language, environment) =>
      record('register_push_token', { token, language, environment }),
    unregister: (token) => record('unregister_push_token', { token }),
  };
}

if (uiVerify) Settings.set({ [STORED_KEY]: '' });

export const pushRegistration = createPushRegistration({
  permission: notices.permission,
  token: uiVerify ? async () => VERIFY_TOKEN : deviceToken,
  rpc: uiVerify ? verifyRpc() : supabaseRpc(),
  stored: {
    get: () => {
      const value: unknown = Settings.get(STORED_KEY);
      return typeof value === 'string' && value.length > 0 ? value : null;
    },
    set: (token) => Settings.set({ [STORED_KEY]: token ?? '' }),
  },
});

userCleanups.register(() => pushRegistration.forget());
