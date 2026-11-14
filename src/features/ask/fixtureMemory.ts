import {
  MEMORY_LIMITS,
  sameLabel,
  type MemoryEntry,
  type MemoryFailure,
  type MemoryService,
} from './memory';

export type FixtureMemory = 'none' | 'some' | 'off' | 'full' | 'long';
export type FixtureMemoryFail = 'load' | 'save' | 'remove' | 'clear' | 'switch';

const AT = '2026-11-14T09:00:00.000Z';

const SOME: MemoryEntry[] = [
  { id: 'mem-dorm', kind: 'place', label: '宿舍', content: 'Sunway Geo', updatedAt: AT },
  { id: 'mem-school', kind: 'place', label: '学校', content: 'Sunway University', updatedAt: AT },
  { id: 'mem-reward', kind: 'preference', label: '赏金一般给', content: 'RM 10–15', updatedAt: AT },
];

const LONG: MemoryEntry[] = [
  {
    id: 'mem-long',
    kind: 'place',
    label: '妈妈每周寄东西来的那个快递柜旁边的宿舍楼',
    content:
      'Sunway Geo Residences Tower B 大堂右手边的 Ninja Van 快递柜，下雨天走二楼连廊，从 Sunway Pyramid 北门出来过天桥',
    updatedAt: AT,
  },
  { id: 'mem-x', kind: 'preference', label: 'x', content: 'y', updatedAt: AT },
];

export const fixtureMemory = (value: string | undefined): FixtureMemory =>
  value === 'some' || value === 'off' || value === 'full' || value === 'long' ? value : 'none';

export const fixtureMemoryFails = (value: string | undefined) =>
  new Set(
    (value ?? '')
      .split(',')
      .filter((point): point is FixtureMemoryFail =>
        ['load', 'save', 'remove', 'clear', 'switch'].includes(point),
      ),
  );

function initial(kind: FixtureMemory): MemoryEntry[] {
  if (kind === 'some' || kind === 'off') return SOME;
  if (kind === 'long') return LONG;
  if (kind !== 'full') return [];
  return Array.from({ length: MEMORY_LIMITS.entriesMax }, (_, index) => ({
    id: `mem-${index}`,
    kind: index % 3 === 0 ? 'preference' : 'place',
    label: `地方 ${index + 1}`,
    content: `Jalan ${index + 1}`,
    updatedAt: AT,
  }));
}

export function createFixtureMemoryService({
  memory,
  failFirst,
  delayMs,
  onCall,
}: {
  memory: FixtureMemory;
  failFirst: Set<FixtureMemoryFail>;
  delayMs: number;
  onCall: (name: string, args: unknown) => void;
}): MemoryService & { usedFor(text: string): MemoryEntry[]; remembering(): boolean } {
  let entries = initial(memory);
  let enabled = memory !== 'off';
  let next = 0;
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  const fails = (point: FixtureMemoryFail) => failFirst.delete(point);
  const refuse = (failure: MemoryFailure) => ({ ok: false as const, failure });

  return {
    async list() {
      onCall('memoryList', null);
      await wait();
      if (fails('load')) throw new Error('fixture: offline');
      return { enabled, entries };
    },
    async save(draft) {
      onCall('memorySave', draft);
      await wait();
      if (fails('save')) return refuse('failed');
      const same = entries.find((entry) => sameLabel(entry.label, draft.label));
      const updatedAt = new Date().toISOString();
      if (draft.id) {
        const current = entries.find((entry) => entry.id === draft.id);
        if (!current) return refuse('notFound');
        if (same && same.id !== draft.id) return refuse('labelTaken');
        const saved = { ...current, ...draft, id: current.id, updatedAt };
        entries = [saved, ...entries.filter((entry) => entry.id !== current.id)];
        return { ok: true, value: saved };
      }
      if (!enabled) return refuse('off');
      if (!same && entries.length >= MEMORY_LIMITS.entriesMax) return refuse('full');
      next += 1;
      const saved = { ...draft, id: same?.id ?? `mem-new-${next}`, updatedAt };
      entries = [saved, ...entries.filter((entry) => entry.id !== saved.id)];
      return { ok: true, value: saved };
    },
    async remove(id) {
      onCall('memoryRemove', { id });
      await wait();
      if (fails('remove')) return refuse('failed');
      entries = entries.filter((entry) => entry.id !== id);
      return { ok: true, value: null };
    },
    async clear() {
      onCall('memoryClear', null);
      await wait();
      if (fails('clear')) return refuse('failed');
      entries = [];
      return { ok: true, value: null };
    },
    async setEnabled(on) {
      onCall('memorySwitch', { enabled: on });
      await wait();
      if (fails('switch')) return refuse('failed');
      enabled = on;
      return { ok: true, value: on };
    },
    usedFor(text) {
      return enabled ? entries.filter((entry) => text.includes(entry.label)).slice(0, 3) : [];
    },
    remembering: () => enabled && entries.length < MEMORY_LIMITS.entriesMax,
  };
}
