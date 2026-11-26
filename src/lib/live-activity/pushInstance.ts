import * as Application from 'expo-application';
import { getCalendars } from 'expo-localization';
import { LiveActivity } from 'tapiro-kit';

import { apnsEnvironment } from '../push/deviceToken';
import { getSupabase, supabaseEndpoint } from '../supabase';
import { createLiveActivityPush } from './push';

async function call(name: string, args: Record<string, string | null>) {
  const client = getSupabase();
  if (!client) return;
  const { error } = await client.rpc(name, args);
  if (error) throw error;
}

export const liveActivityPush = createLiveActivityPush({
  endpoint: supabaseEndpoint,
  setUp: (url, anonKey) => LiveActivity.pushSetUp(url, anonKey),
  environment: async () =>
    apnsEnvironment(
      await Application.getIosPushNotificationServiceEnvironmentAsync().catch(() => null),
      __DEV__,
    ),
  style: () => {
    const [calendar] = getCalendars();
    return {
      timeZone: calendar?.timeZone ?? 'UTC',
      clock: calendar?.uses24hourClock === false ? 'h12' : 'h23',
    };
  },
  register: (device) =>
    call('register_live_activity_device', {
      device_key: device.deviceKey,
      start_token: device.startToken,
      language: device.language,
      environment: device.environment,
      time_zone: device.timeZone,
      clock: device.clock,
    }),
  unregister: async (deviceKey) => {
    const endpoint = supabaseEndpoint();
    if (!endpoint) return;
    const response = await fetch(`${endpoint.url}/rest/v1/rpc/unregister_live_activity_device`, {
      method: 'POST',
      headers: {
        apikey: endpoint.anonKey,
        Authorization: `Bearer ${endpoint.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_key: deviceKey }),
    });
    if (!response.ok) throw new Error(`unregister_live_activity_device ${response.status}`);
  },
  flush: () => LiveActivity.pushFlush(),
});
