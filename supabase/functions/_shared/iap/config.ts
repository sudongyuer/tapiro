export const IAP_ENVIRONMENTS = ['Production', 'Sandbox', 'Xcode', 'LocalTesting'] as const;
export type IapEnvironment = (typeof IAP_ENVIRONMENTS)[number];

export const BUNDLE_ID = 'app.tapiro';

export type IapConfig = {
  bundleId: string;
  appAppleId: number | null;
  accepted: ReadonlySet<IapEnvironment>;
};

const LOCAL_HOSTS = new Set(['kong', 'localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);

export function isIapEnvironment(value: unknown): value is IapEnvironment {
  return typeof value === 'string' && (IAP_ENVIRONMENTS as readonly string[]).includes(value);
}

function isLocalStack(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
}

// Xcode and LocalTesting transactions carry no App Store signature (the library skips the check), so they are
// accepted only when the flag is set AND the function runs against a local stack; a hosted project never accepts
// them even if the flag is copied there.
export function iapConfig(env: (key: string) => string | undefined): IapConfig {
  const accepted = new Set<IapEnvironment>(['Sandbox']);
  const appAppleId = Number(env('IAP_APP_APPLE_ID'));
  const hasAppAppleId = Number.isSafeInteger(appAppleId) && appAppleId > 0;
  if (hasAppAppleId) accepted.add('Production');
  if (env('IAP_ALLOW_XCODE') === '1' && isLocalStack(env('SUPABASE_URL'))) {
    accepted.add('Xcode');
    accepted.add('LocalTesting');
  }
  return { bundleId: BUNDLE_ID, appAppleId: hasAppAppleId ? appAppleId : null, accepted };
}
