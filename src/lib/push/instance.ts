import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Settings } from 'react-native';

import { notices } from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';
import { uiVerify } from '@/lib/uiVerify';
import { userCleanups } from '@/lib/userCleanups';

import { createPushRegistration, type PushRpc } from './pushRegistration';

const STORED_KEY = 'tapiro.pushToken';
const VERIFY_CALLS_KEY = 'uiVerifyPushCalls';
const VERIFY_TOKEN = 'ExponentPushToken[uiVerify]';
const TOKEN_TIMEOUT_MS = 15_000;

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const id = extra?.eas?.projectId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

let cached: { device: string; expo: string } | null = null;

async function expoToken(): Promise<string | null> {
  const id = projectId();
  if (!id) return null;
  const device = await Notifications.getDevicePushTokenAsync();
  const key = String(device.data);
  if (cached?.device === key) return cached.expo;
  const expo = await withTimeout(
    Notifications.getExpoPushTokenAsync({ projectId: id, devicePushToken: device }),
    TOKEN_TIMEOUT_MS,
  );
  if (expo) cached = { device: key, expo: expo.data };
  return expo?.data ?? null;
}

function supabaseRpc(): PushRpc {
  const call = async (name: string, args: Record<string, string>) => {
    const client = getSupabase();
    if (!client) return;
    const { error } = await client.rpc(name, args);
    if (error) throw error;
  };
  return {
    register: (token, language) => call('register_push_token', { token, language }),
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
    register: (token, language) => record('register_push_token', { token, language }),
    unregister: (token) => record('unregister_push_token', { token }),
  };
}

if (uiVerify) Settings.set({ [STORED_KEY]: '' });

export const pushRegistration = createPushRegistration({
  permission: notices.permission,
  token: uiVerify ? async () => VERIFY_TOKEN : expoToken,
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
