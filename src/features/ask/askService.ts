import type { SupabaseClient } from '@supabase/supabase-js';

import type { CloudAnswer, CloudRequest } from './cloudGate';
import { toConsentStatus, toWriteFailure, type AskService, type WriteResult } from './consent';

export const AI_DRAFT_FUNCTION = 'ai-draft';

export function createSupabaseAskService(client: SupabaseClient | null): AskService {
  const db = () => {
    if (!client) throw new Error('Supabase is not configured');
    return client;
  };
  const write = async (rpc: Promise<{ data: unknown; error: unknown }>): Promise<WriteResult> => {
    try {
      const { data, error } = await rpc;
      if (error) return { ok: false, failure: toWriteFailure(error) };
      return { ok: true, status: toConsentStatus(data) };
    } catch {
      return { ok: false, failure: 'failed' };
    }
  };
  return {
    async status() {
      const { data, error } = await db().rpc('ai_status');
      if (error) throw error;
      return toConsentStatus(data);
    },
    recordConsent: (version) =>
      write(Promise.resolve().then(() => db().rpc('record_consent', { version }))),
    withdrawConsent: () => write(Promise.resolve().then(() => db().rpc('withdraw_consent'))),
  };
}

export function createCloudSender(client: SupabaseClient | null) {
  return async function send(request: CloudRequest): Promise<CloudAnswer> {
    if (!client) return { ok: false, error: null, status: null };
    const { data, error } = await client.functions.invoke(AI_DRAFT_FUNCTION, {
      method: 'POST',
      body: request,
    });
    if (!error) return { ok: true, body: data };
    const response = (error as { context?: unknown }).context;
    if (!(response instanceof Response)) return { ok: false, error: null, status: null };
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    return {
      ok: false,
      error: typeof body?.error === 'string' ? body.error : null,
      status: response.status,
    };
  };
}
