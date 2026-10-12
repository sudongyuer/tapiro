import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { uiVerify } from '@/lib/uiVerify';

import { sessionStorage } from './sessionStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    url && anonKey && !uiVerify
      ? createClient(url, anonKey, {
          auth: {
            storage: sessionStorage,
            storageKey: 'tapiro.auth',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        })
      : null;
  if (client) keepRefreshingWhileActive(client);
  return client;
}

function keepRefreshingWhileActive(supabase: SupabaseClient) {
  if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
