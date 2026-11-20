import { canSchedule } from '@/lib/notifications/permission';
import type { NoticePermission } from '@/lib/notifications/types';

import type { DeviceToken } from './deviceToken';

export type PushRpc = {
  register(token: string, language: string, environment: DeviceToken['environment']): Promise<void>;
  unregister(token: string): Promise<void>;
};

export type PushDeps = {
  permission(): Promise<NoticePermission>;
  token(): Promise<DeviceToken | null>;
  rpc: PushRpc;
  stored: { get(): string | null; set(token: string | null): void };
};

type Registered = DeviceToken & { userId: string; language: string };

export function createPushRegistration(deps: PushDeps) {
  let registered: Registered | null = null;
  let epoch = 0;
  let queue: Promise<void> = Promise.resolve();

  const serial = (task: () => Promise<void>) => {
    queue = queue.then(task).catch(() => undefined);
    return queue;
  };

  return {
    sync(userId: string, language: string) {
      const started = epoch;
      return serial(async () => {
        if (!canSchedule(await deps.permission())) return;
        const device = await deps.token();
        if (!device || started !== epoch) return;
        const { token, environment } = device;
        const same =
          registered?.userId === userId &&
          registered.token === token &&
          registered.environment === environment;
        if (same && registered?.language === language) return;
        // Stored before the call, so a sign-out that lands while it is in flight still removes the row it creates.
        deps.stored.set(token);
        await deps.rpc.register(token, language, environment);
        if (started === epoch) registered = { userId, token, environment, language };
      });
    },
    async signOut(wait: { expired: boolean } = { expired: false }) {
      epoch += 1;
      await queue;
      const token = registered?.token ?? deps.stored.get();
      registered = null;
      deps.stored.set(null);
      if (token && !wait.expired) await deps.rpc.unregister(token).catch(() => undefined);
    },
    forget() {
      epoch += 1;
      registered = null;
      deps.stored.set(null);
    },
  };
}

export type PushRegistration = ReturnType<typeof createPushRegistration>;
