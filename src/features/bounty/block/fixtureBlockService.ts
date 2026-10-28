import type { BlockService, BlockedPerson } from './types';

export type FixtureBlockOptions = {
  people: readonly BlockedPerson[];
  seeded?: readonly string[];
  writeDelayMs?: number;
};

const pause = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export function createFixtureBlockService(options: FixtureBlockOptions) {
  const blocked: string[] = [...(options.seeded ?? [])];
  const known = (id: string) => options.people.find((person) => person.id === id) ?? null;

  const service: BlockService = {
    async block(target) {
      await pause(options.writeDelayMs ?? 0);
      if (!known(target)) return 'gone';
      if (!blocked.includes(target)) blocked.unshift(target);
      return 'blocked';
    },
    async unblock(target) {
      await pause(options.writeDelayMs ?? 0);
      const index = blocked.indexOf(target);
      if (index >= 0) blocked.splice(index, 1);
    },
    async list() {
      return blocked.map((id) => ({ id, name: known(id)?.name ?? null }));
    },
  };

  return { service, isBlocked: (id: string) => blocked.includes(id) };
}
