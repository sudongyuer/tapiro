import { ASR_PATH, CHAT_PATH, PRIMARY_MODEL } from './models.ts';
import { asrBody, readTranscript } from './modelStudioAsr.ts';
import { isRecord, readCompletion, requestBody, type ChatCall } from './modelStudioChat.ts';
import type { AiProvider, ProviderCall, ProviderReply } from './provider.ts';

export type ModelStudioConfig = {
  origin: string;
  apiKey: string;
  fallback: string | null;
  fetch?: typeof fetch;
  now?: () => number;
};

export const FALLBACK_WINDOW_MS = 12_000;
export const UNREACHABLE_WINDOW_MS = 3_000;

const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);
const SAFE_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

export class ModelStudioError extends Error {
  constructor(
    readonly code: string,
    readonly fallback: boolean,
  ) {
    super(code);
  }
}

export function errorCode(status: number, body: unknown): string {
  const nested = isRecord(body) && isRecord(body.error) ? body.error.code : undefined;
  const code = nested ?? (isRecord(body) ? body.code : undefined);
  return typeof code === 'string' && SAFE_CODE.test(code) ? code : `http_${status}`;
}

function log(code: string, model: string) {
  console.error(`ai-draft: model_studio ${code} ${model}`);
}

export function modelStudioProvider(config: ModelStudioConfig): AiProvider {
  const send = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const origin = config.origin.replace(/\/+$/, '');

  function request(call: ProviderCall, model: string) {
    if (call.task === 'transcribe') {
      return {
        url: `${origin}${ASR_PATH}`,
        headers: { 'X-DashScope-SSE': 'disable' } as Record<string, string>,
        body: asrBody(call, model),
        read: (body: unknown) => readTranscript(body, model),
      };
    }
    return {
      url: `${origin}${CHAT_PATH}`,
      headers: {} as Record<string, string>,
      body: requestBody(call as ChatCall, model, new Date(now())),
      read: (body: unknown) => readCompletion(body, call, model),
    };
  }

  async function attempt(
    call: ProviderCall,
    model: string,
    signal: AbortSignal,
  ): Promise<ProviderReply> {
    const { url, headers, body: payload, read } = request(call, model);
    let response: Response;
    const sentAt = now();
    try {
      response = await send(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch {
      if (signal.aborted) throw new ModelStudioError('aborted', false);
      log('unreachable', model);
      throw new ModelStudioError('unreachable', now() - sentAt <= UNREACHABLE_WINDOW_MS);
    }
    if (!response.ok) {
      const code = errorCode(response.status, await response.json().catch(() => null));
      log(`${response.status} ${code}`, model);
      throw new ModelStudioError(code, FALLBACK_STATUSES.has(response.status));
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (signal.aborted) throw new ModelStudioError('aborted', false);
      log('unreadable_body', model);
      body = null;
    }
    return read(body);
  }

  return {
    async generate(call, signal) {
      const started = now();
      try {
        return await attempt(call, PRIMARY_MODEL[call.task], signal);
      } catch (error) {
        const fallback = call.task === 'transcribe' ? null : config.fallback;
        const late = now() - started > FALLBACK_WINDOW_MS;
        const retryable = error instanceof ModelStudioError && error.fallback;
        if (!fallback || !retryable || signal.aborted || late) throw error;
        log('fallback', fallback);
        return await attempt(call, fallback, signal);
      }
    },
  };
}
