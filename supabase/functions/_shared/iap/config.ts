export const IAP_ENVIRONMENTS = ['Production', 'Sandbox', 'Xcode', 'LocalTesting'] as const;
export type IapEnvironment = (typeof IAP_ENVIRONMENTS)[number];

export const BUNDLE_ID = 'app.tapiro';

export type IapConfig = {
  bundleId: string;
  appAppleId: number | null;
  accepted: ReadonlySet<IapEnvironment>;
  testRoots: readonly string[];
};

type Env = (key: string) => string | undefined;

const LOCAL_HOSTS = new Set(['kong', 'localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);
const HOSTED_MARKERS = ['SB_REGION', 'DENO_DEPLOYMENT_ID'];
const CLI_DEMO_ISSUER = 'supabase-demo';

export function isIapEnvironment(value: unknown): value is IapEnvironment {
  return typeof value === 'string' && (IAP_ENVIRONMENTS as readonly string[]).includes(value);
}

function hasLocalHost(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
}

function issuer(jwt: string | undefined) {
  const part = jwt?.split('.')[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.iss === 'string' ? payload.iss : null;
  } catch {
    return null;
  }
}

// Three independent signs of the CLI's local stack, all required: a container-network or loopback URL; none of the
// variables Supabase sets only in hosted functions (https://supabase.com/docs/guides/functions/secrets, "In a hosted
// environment"; SB_EXECUTION_ID is set locally too, so it is not one of them); and the CLI's public demo service-role
// key, which a project reachable by others must not use. A VM given local.env and a kong URL still fails the third.
export function isLocalStack(env: Env) {
  return (
    hasLocalHost(env('SUPABASE_URL')) &&
    HOSTED_MARKERS.every((key) => !env(key)) &&
    issuer(env('SUPABASE_SERVICE_ROLE_KEY')) === CLI_DEMO_ISSUER
  );
}

// Xcode and LocalTesting transactions carry no App Store signature, and a test root lets anyone holding its key sign
// Sandbox transactions, so both need the explicit flag AND the local stack; a hosted project ignores the flags.
export function iapConfig(env: Env): IapConfig {
  const accepted = new Set<IapEnvironment>(['Sandbox']);
  const appAppleId = Number(env('IAP_APP_APPLE_ID'));
  const hasAppAppleId = Number.isSafeInteger(appAppleId) && appAppleId > 0;
  if (hasAppAppleId) accepted.add('Production');
  const local = isLocalStack(env);
  if (local && env('IAP_ALLOW_XCODE') === '1') {
    accepted.add('Xcode');
    accepted.add('LocalTesting');
  }
  const testRoot = env('IAP_TEST_ROOT');
  return {
    bundleId: BUNDLE_ID,
    appAppleId: hasAppAppleId ? appAppleId : null,
    accepted,
    testRoots: local && testRoot ? [testRoot] : [],
  };
}
