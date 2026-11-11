import { consentAccess, type ConsentStore } from './consentStore';

export type CloudTask = 'draft_bounty' | 'answer' | 'translate';

export type CloudRequest = { task: CloudTask; input: { text: string; to?: string } };

export type CloudAnswer =
  { ok: true; body: unknown } | { ok: false; error: string | null; status: number | null };

export type CloudResult =
  | { kind: 'answered'; body: unknown }
  | { kind: 'consentRequired' }
  | { kind: 'needsUpdate' }
  | { kind: 'unavailable' }
  | { kind: 'failed'; error: string | null };

export function createCloudGate({
  store,
  send,
}: {
  store: ConsentStore;
  send: (request: CloudRequest) => Promise<CloudAnswer>;
}) {
  return async function call(request: CloudRequest): Promise<CloudResult> {
    const access = consentAccess(store.getSnapshot());
    if (access === null) return { kind: 'unavailable' };
    if (access === 'needsUpdate') return { kind: 'needsUpdate' };
    if (access !== 'given') return { kind: 'consentRequired' };
    const answer = await send(request).catch((): CloudAnswer => ({
      ok: false,
      error: null,
      status: null,
    }));
    if (answer.ok) return { kind: 'answered', body: answer.body };
    if (answer.error === 'consent_required') {
      store.markRefused();
      return { kind: 'consentRequired' };
    }
    return { kind: 'failed', error: answer.error };
  };
}

export type CloudCall = ReturnType<typeof createCloudGate>;
