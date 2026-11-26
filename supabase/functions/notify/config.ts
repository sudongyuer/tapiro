import { isLocalStack, type Env } from '../_shared/localStack.ts';
import { APNS_ORIGINS, APP_TOPIC, apnsSenders, importApnsKey, type ApnsSenders } from './apns.ts';
import type { PushSender } from './handler.ts';

export const TEST_APNS_HEADER = 'x-tapiro-test-apns';
export const TEST_KEY_ID = 'TESTKEY001';
export const TEST_TEAM_ID = 'TESTTEAM01';

const failingSend = (error: string) => async (pushes: unknown[]) =>
  pushes.map(() => ({ ok: false as const, error }));

const failing = (error: string): ApnsSenders => ({
  pushes: { send: failingSend(error) },
  liveActivities: { send: failingSend(error) },
});

export async function liveSender(env: Env): Promise<ApnsSenders | null> {
  const keyId = env('APNS_KEY_ID')?.trim();
  const teamId = env('APNS_TEAM_ID')?.trim();
  const pem = env('APNS_PRIVATE_KEY')?.trim();
  if (!keyId || !teamId || !pem) return null;
  try {
    const key = await importApnsKey(pem);
    return apnsSenders({ keyId, teamId, key, topic: APP_TOPIC, origins: APNS_ORIGINS });
  } catch {
    return failing('apns_bad_key');
  }
}

// The stack test drives the real sender against a mock APNs; only the CLI's local stack with the explicit flag honours
// the header, so a hosted project can never be pointed away from Apple.
export async function localTestSender(env: Env): Promise<ApnsSenders | null> {
  const origin = env('APNS_TEST_ORIGIN');
  const pem = env('APNS_TEST_PRIVATE_KEY');
  if (env('APNS_ALLOW_TEST') !== '1' || !origin || !pem || !isLocalStack(env)) return null;
  let key: CryptoKey;
  try {
    key = await importApnsKey(pem);
  } catch {
    return failing('apns_bad_key');
  }
  return apnsSenders({
    keyId: TEST_KEY_ID,
    teamId: TEST_TEAM_ID,
    key,
    topic: APP_TOPIC,
    origins: { production: `${origin}/production`, sandbox: `${origin}/sandbox` },
  });
}

// Live Activity pushes are never recorded locally: without APNs they fail and the next tick tries again.
export function unconfiguredSender(env: Env, recording: PushSender): ApnsSenders {
  const unconfigured = failing('apns_not_configured');
  return isLocalStack(env) ? { ...unconfigured, pushes: recording } : unconfigured;
}

export function senderFor(req: Request, configured: ApnsSenders, test: ApnsSenders | null) {
  return test && req.headers.get(TEST_APNS_HEADER) === '1' ? test : configured;
}
