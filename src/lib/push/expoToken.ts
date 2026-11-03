export type TokenSource = {
  projectId(): string | null;
  device(): Promise<{ data: unknown }>;
  expo(projectId: string, device: { data: unknown }): Promise<{ data: string }>;
};

type Timers = { set: (run: () => void, ms: number) => unknown; clear: (handle: unknown) => void };

const SYSTEM_TIMERS: Timers = {
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export const TOKEN_TIMEOUT_MS = 15_000;

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

export function createExpoToken(source: TokenSource, timers: Timers = SYSTEM_TIMERS) {
  let cached: { device: string; expo: string } | null = null;

  async function read(projectId: string) {
    const device = await source.device();
    const key = String(device.data);
    if (cached?.device === key) return cached.expo;
    const expo = await source.expo(projectId, device);
    cached = { device: key, expo: expo.data };
    return expo.data;
  }

  return async (): Promise<string | null> => {
    const projectId = source.projectId();
    if (!projectId) return null;
    return withTimeout(read(projectId), TOKEN_TIMEOUT_MS, timers);
  };
}
