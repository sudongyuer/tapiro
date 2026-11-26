import type { LiveActivityPushSetUp } from 'tapiro-kit';

import type { ApnsEnvironment } from '../push/deviceToken';

export type LiveActivityDevice = {
  deviceKey: string;
  startToken: string | null;
  language: string;
  environment: ApnsEnvironment;
  timeZone: string;
  clock: 'h23' | 'h12';
};

export type LiveActivityPushDeps = {
  endpoint(): { url: string; anonKey: string } | null;
  setUp(url: string, anonKey: string): Promise<LiveActivityPushSetUp>;
  environment(): Promise<ApnsEnvironment>;
  style(): { timeZone: string; clock: 'h23' | 'h12' };
  register(device: LiveActivityDevice): Promise<void>;
  unregister(deviceKey: string): Promise<void>;
  flush(): Promise<void>;
};

const same = (registered: LiveActivityDevice, next: LiveActivityDevice) =>
  (Object.keys(next) as (keyof LiveActivityDevice)[]).every((key) => registered[key] === next[key]);

export function createLiveActivityPush(deps: LiveActivityPushDeps) {
  let registered: (LiveActivityDevice & { userId: string }) | null = null;
  let deviceKey: string | null = null;
  let epoch = 0;
  let queue: Promise<void> = Promise.resolve();

  const serial = (task: () => Promise<void>) => {
    queue = queue.then(task).catch(() => undefined);
    return queue;
  };

  return {
    sync(userId: string, language: string, startToken?: string) {
      const started = epoch;
      return serial(async () => {
        const endpoint = deps.endpoint();
        if (!endpoint) return;
        const native = await deps.setUp(endpoint.url, endpoint.anonKey);
        if (!native.deviceKey || started !== epoch) return;
        const device: LiveActivityDevice = {
          deviceKey: native.deviceKey,
          startToken: startToken ?? native.startToken ?? null,
          language,
          environment: await deps.environment(),
          ...deps.style(),
        };
        if (registered?.userId !== userId || !same(registered, device)) {
          deviceKey = device.deviceKey;
          await deps.register(device);
          if (started !== epoch) return;
          registered = { ...device, userId };
        }
        await deps.flush();
      });
    },
    async signOut() {
      epoch += 1;
      await queue;
      const known = deviceKey;
      registered = null;
      deviceKey = null;
      const endpoint = deps.endpoint();
      const key =
        known ??
        (endpoint
          ? await deps
              .setUp(endpoint.url, endpoint.anonKey)
              .then((native) => native.deviceKey ?? null)
              .catch(() => null)
          : null);
      if (key) await deps.unregister(key).catch(() => undefined);
    },
  };
}

export type LiveActivityPush = ReturnType<typeof createLiveActivityPush>;
