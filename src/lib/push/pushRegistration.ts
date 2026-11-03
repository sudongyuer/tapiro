import { canSchedule } from '@/lib/notifications/permission';
import type { NoticePermission } from '@/lib/notifications/types';

export type PushRpc = {
  register(token: string, language: string): Promise<void>;
  setLanguage(language: string): Promise<void>;
  unregister(token: string): Promise<void>;
};

export type PushDeps = {
  permission(): Promise<NoticePermission>;
  token(): Promise<string | null>;
  rpc: PushRpc;
  stored: { get(): string | null; set(token: string | null): void };
};

type Registered = { userId: string; token: string; language: string };

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
        const token = await deps.token();
        if (!token || started !== epoch) return;
        if (registered?.userId === userId && registered.token === token) {
          if (registered.language === language) return;
          await deps.rpc.setLanguage(language);
          registered = { ...registered, language };
          return;
        }
        await deps.rpc.register(token, language);
        if (started !== epoch) return;
        registered = { userId, token, language };
        deps.stored.set(token);
      });
    },
    async signOut() {
      epoch += 1;
      const token = registered?.token ?? deps.stored.get();
      registered = null;
      deps.stored.set(null);
      if (token) await deps.rpc.unregister(token).catch(() => undefined);
    },
    forget() {
      epoch += 1;
      registered = null;
      deps.stored.set(null);
    },
  };
}

export type PushRegistration = ReturnType<typeof createPushRegistration>;
