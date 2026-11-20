export type ApnsEnvironment = 'sandbox' | 'production';
export type DeviceToken = { token: string; environment: ApnsEnvironment };
export type ApsEntitlement = 'development' | 'production' | null;

export type TokenSource = {
  device(): Promise<{ data: unknown }>;
  entitlement(): Promise<ApsEntitlement>;
  development: boolean;
};

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

const SYSTEM_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export const TOKEN_TIMEOUT_MS = 15_000;
const APNS_TOKEN = /^[0-9a-f]{64,200}$/;

// App Store and TestFlight installs carry no embedded provisioning profile, so a missing entitlement means production
// there; only a development build (the Simulator) reads it as sandbox.
export function apnsEnvironment(
  entitlement: ApsEntitlement,
  development: boolean,
): ApnsEnvironment {
  if (entitlement === 'development') return 'sandbox';
  if (entitlement === 'production') return 'production';
  return development ? 'sandbox' : 'production';
}

async function withTimeout<T>(task: Promise<T>, ms: number, timers: Timers): Promise<T | null> {
  let timer: unknown = null;
  const timeout = new Promise<null>((resolve) => {
    timer = timers.set(() => resolve(null), ms);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    timers.clear(timer);
  }
}

export function createDeviceToken(source: TokenSource, timers: Timers = SYSTEM_TIMERS) {
  async function read(): Promise<DeviceToken | null> {
    const [device, entitlement] = await Promise.all([
      source.device(),
      source.entitlement().catch(() => null),
    ]);
    const token = typeof device.data === 'string' ? device.data.toLowerCase() : '';
    if (!APNS_TOKEN.test(token)) return null;
    return { token, environment: apnsEnvironment(entitlement, source.development) };
  }

  return (): Promise<DeviceToken | null> => withTimeout(read(), TOKEN_TIMEOUT_MS, timers);
}
