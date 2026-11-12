import { MAX_OUTPUT_TOKENS, PRIMARY_MODEL } from './models.ts';
import { systemPrompt, userContent } from './prompts.ts';
import type { AiProvider, ProviderCall, ProviderReply } from './provider.ts';

export type ModelStudioConfig = {
  baseUrl: string;
  apiKey: string;
  fallback: string | null;
  fetch?: typeof fetch;
  now?: () => number;
};

export const FALLBACK_WINDOW_MS = 12_000;
export const UNREACHABLE_WINDOW_MS = 3_000;

const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);
const COMPLETE = new Set(['stop', 'tool_calls']);
const TOOL_CALL_IN_PROSE = /<\/?tool_call>|^\s*[{[]/;
const SAFE_CODE = /^[A-Za-z0-9_.-]{1,64}$/;

export class ModelStudioError extends Error {
  constructor(
    readonly code: string,
    readonly fallback: boolean,
  ) {
    super(code);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const count = (value: unknown) =>
  Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : Number.NaN;

export function requestBody(call: ProviderCall, model: string, now: Date) {
  const tools = call.tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
  const only = call.tools.length === 1 ? call.tools[0].name : null;
  return {
    model,
    messages: [
      { role: 'system', content: systemPrompt(call, now) },
      { role: 'user', content: userContent(call) },
    ],
    tools,
    tool_choice: only ? { type: 'function', function: { name: only } } : 'auto',
    parallel_tool_calls: false,
    enable_thinking: false,
    max_tokens: MAX_OUTPUT_TOKENS[call.task],
    stream: false,
  };
}

function parseArguments(raw: unknown): unknown {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function completeMessage(body: Record<string, unknown>) {
  const choices = body.choices;
  if (!Array.isArray(choices) || !isRecord(choices[0])) return null;
  const { message, finish_reason: finish } = choices[0];
  return isRecord(message) && typeof finish === 'string' && COMPLETE.has(finish) ? message : null;
}

function toolOf(message: Record<string, unknown> | null, call: ProviderCall) {
  const calls = message?.tool_calls;
  if (Array.isArray(calls) && isRecord(calls[0]) && isRecord(calls[0].function)) {
    const { name, arguments: raw } = calls[0].function;
    return { toolName: typeof name === 'string' ? name : '', arguments: parseArguments(raw) };
  }
  const content = typeof message?.content === 'string' ? message.content.trim() : '';
  const prose = content !== '' && !TOOL_CALL_IN_PROSE.test(content);
  const chosen = call.tools.length > 1;
  if (prose && chosen && call.tools.some((tool) => tool.name === 'answer')) {
    return { toolName: 'answer', arguments: { text: content } };
  }
  return { toolName: '', arguments: null };
}

export function readCompletion(body: unknown, call: ProviderCall, model: string): ProviderReply {
  if (!isRecord(body)) {
    return { toolName: '', arguments: null, model, inputTokens: NaN, outputTokens: NaN };
  }
  const usage = isRecord(body.usage) ? body.usage : {};
  return {
    ...toolOf(completeMessage(body), call),
    model,
    inputTokens: count(usage.prompt_tokens),
    outputTokens: count(usage.completion_tokens),
  };
}

export function errorCode(status: number, body: unknown): string {
  const code = isRecord(body) && isRecord(body.error) ? body.error.code : undefined;
  return typeof code === 'string' && SAFE_CODE.test(code) ? code : `http_${status}`;
}

function log(code: string, model: string) {
  console.error(`ai-draft: model_studio ${code} ${model}`);
}

export function modelStudioProvider(config: ModelStudioConfig): AiProvider {
  const send = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;

  async function attempt(call: ProviderCall, model: string, signal: AbortSignal) {
    let response: Response;
    const sentAt = now();
    try {
      response = await send(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody(call, model, new Date(now()))),
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
    return readCompletion(body, call, model);
  }

  return {
    async generate(call, signal) {
      const started = now();
      try {
        return await attempt(call, PRIMARY_MODEL[call.task], signal);
      } catch (error) {
        const { fallback } = config;
        const late = now() - started > FALLBACK_WINDOW_MS;
        const retryable = error instanceof ModelStudioError && error.fallback;
        if (!fallback || !retryable || signal.aborted || late) throw error;
        log('fallback', fallback);
        return await attempt(call, fallback, signal);
      }
    },
  };
}
