import { isLocalStack, type Env } from '../localStack.ts';

export const IAP_ENVIRONMENTS = ['Production', 'Sandbox', 'Xcode', 'LocalTesting'] as const;
export type IapEnvironment = (typeof IAP_ENVIRONMENTS)[number];

export const BUNDLE_ID = 'app.tapiro';

export type IapConfig = {
  bundleId: string;
  appAppleId: number | null;
  accepted: ReadonlySet<IapEnvironment>;
  testRoots: readonly string[];
};

export function isIapEnvironment(value: unknown): value is IapEnvironment {
  return typeof value === 'string' && (IAP_ENVIRONMENTS as readonly string[]).includes(value);
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
