import type { SupabaseClient } from '@supabase/supabase-js';

export const MEMORY_KINDS = ['place', 'preference'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_LIMITS = { labelMax: 40, contentMax: 200, entriesMax: 50, usedMax: 3 } as const;

export type MemoryEntry = {
  id: string;
  kind: MemoryKind;
  label: string;
  content: string;
  updatedAt: string;
};

export type MemoryList = { enabled: boolean; entries: MemoryEntry[] };

export type MemoryDraft = { id: string | null; kind: MemoryKind; label: string; content: string };

export type MemoryOffer = { kind: MemoryKind; label: string; content: string };

export type MemoryUse = { id: string; kind: MemoryKind; label: string; content: string };

export type MemoryOutcome = { used: MemoryUse[]; offer: MemoryOffer | null };

export type MemoryFailure = 'off' | 'full' | 'labelTaken' | 'notFound' | 'invalid' | 'failed';

export type MemoryResult<T> = { ok: true; value: T } | { ok: false; failure: MemoryFailure };

export type MemoryService = {
  list(): Promise<MemoryList>;
  save(draft: MemoryDraft): Promise<MemoryResult<MemoryEntry>>;
  remove(id: string): Promise<MemoryResult<null>>;
  clear(): Promise<MemoryResult<null>>;
  setEnabled(enabled: boolean): Promise<MemoryResult<boolean>>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const kindOf = (value: unknown) => MEMORY_KINDS.find((kind) => kind === value) ?? null;

const filled = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() !== '' && [...value.trim()].length <= max
    ? value.trim()
    : null;

function parseUse(value: unknown): MemoryUse | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  const kind = kindOf(value.kind);
  const label = filled(value.label, MEMORY_LIMITS.labelMax);
  const content = filled(value.content, MEMORY_LIMITS.contentMax);
  return kind && label && content ? { id: value.id, kind, label, content } : null;
}

export function parseMemoryEntry(value: unknown): MemoryEntry | null {
  const use = parseUse(value);
  if (!use || !isRecord(value)) return null;
  const updatedAt = value.updatedAt ?? value.updated_at;
  return typeof updatedAt === 'string' ? { ...use, updatedAt } : null;
}

function parseOffer(value: unknown): MemoryOffer | null {
  if (!isRecord(value)) return null;
  const kind = kindOf(value.kind);
  const label = filled(value.label, MEMORY_LIMITS.labelMax);
  const content = filled(value.content, MEMORY_LIMITS.contentMax);
  return kind && label && content ? { kind, label, content } : null;
}

export function parseMemoryOutcome(value: unknown): MemoryOutcome | null {
  if (!isRecord(value)) return null;
  const used = Array.isArray(value.used)
    ? value.used
        .slice(0, MEMORY_LIMITS.usedMax)
        .map(parseUse)
        .filter((use): use is MemoryUse => use !== null)
    : [];
  const offer = parseOffer(value.offer);
  return used.length > 0 || offer ? { used, offer } : null;
}

export const sameLabel = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function checkMemoryDraft(draft: MemoryDraft): MemoryDraft | null {
  const label = filled(draft.label, MEMORY_LIMITS.labelMax);
  const content = filled(draft.content, MEMORY_LIMITS.contentMax);
  return label && content ? { ...draft, label, content } : null;
}

const FAILURES: Record<string, MemoryFailure> = {
  memory_off: 'off',
  memory_full: 'full',
  label_taken: 'labelTaken',
  memory_not_found: 'notFound',
  invalid_memory: 'invalid',
};

export function toMemoryFailure(error: unknown): MemoryFailure {
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : '';
  return FAILURES[message] ?? 'failed';
}

export function createSupabaseMemoryService(client: SupabaseClient | null): MemoryService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  async function attempt<T>(
    run: () => PromiseLike<{ data: unknown; error: unknown }>,
    read: (data: unknown) => { value: T } | null,
  ): Promise<MemoryResult<T>> {
    try {
      const { data, error } = await run();
      if (error) return { ok: false, failure: toMemoryFailure(error) };
      const parsed = read(data);
      return parsed === null ? { ok: false, failure: 'failed' } : { ok: true, value: parsed.value };
    } catch {
      return { ok: false, failure: 'failed' };
    }
  }
  return {
    async list() {
      const [entries, prefs] = await Promise.all([
        db()
          .from('ai_memory')
          .select('id, kind, label, content, updated_at')
          .order('updated_at', { ascending: false }),
        db().from('ai_memory_prefs').select('enabled').maybeSingle(),
      ]);
      if (entries.error || prefs.error) throw entries.error ?? prefs.error;
      const parsed = (entries.data ?? []).map(parseMemoryEntry);
      if (parsed.some((entry) => entry === null)) throw new Error('memory: unreadable entry');
      const enabled = (prefs.data as { enabled?: unknown } | null)?.enabled;
      return {
        enabled: typeof enabled === 'boolean' ? enabled : true,
        entries: parsed as MemoryEntry[],
      };
    },
    save: (draft) =>
      attempt(
        () =>
          db().rpc('save_ai_memory', {
            entry: draft.id,
            kind: draft.kind,
            label: draft.label,
            content: draft.content,
          }),
        (data) => {
          const entry = parseMemoryEntry(data);
          return entry ? { value: entry } : null;
        },
      ),
    remove: (id) =>
      attempt(
        () => db().from('ai_memory').delete().eq('id', id).select('id'),
        (data) => (Array.isArray(data) ? { value: null } : null),
      ),
    clear: () =>
      attempt(
        () => db().rpc('clear_ai_memory'),
        (data) => (typeof data === 'number' ? { value: null } : null),
      ),
    setEnabled: (enabled) =>
      attempt(
        () => db().rpc('set_ai_memory_enabled', { enabled }),
        (data) =>
          isRecord(data) && typeof data.enabled === 'boolean' ? { value: data.enabled } : null,
      ),
  };
}
