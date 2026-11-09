import { energyCost, PLACEHOLDER_FULL_BELLY_TOKENS } from './budget.ts';
import type { AiProvider, ProviderReply } from './provider.ts';
import {
  parseAiRequest,
  TOOL_SCHEMAS,
  validToolResult,
  type AiRequest,
  type AiTask,
} from './tools.ts';

export type BeginResult =
  | { status: 'consent_required' | 'hungry' | 'busy' }
  | { status: 'ok'; lease: string; energy: number; energyFull: number };

export type MeterRow = {
  userId: string;
  lease: string;
  task: AiTask;
  model: string;
  inputTokens: number;
  outputTokens: number;
  energySpent: number;
};

export type AiStore = {
  begin(userId: string): Promise<BeginResult>;
  finish(row: MeterRow): Promise<{ energy: number; energyFull: number }>;
  abort(userId: string, lease: string): Promise<void>;
};

export type AiDraftDeps = {
  userIdFromToken(token: string): Promise<string | null>;
  store: AiStore;
  provider: AiProvider | null;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

const REFUSALS = {
  consent_required: 403,
  busy: 409,
  hungry: 429,
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const failure = (status: number, error: string) => json(status, { error });

async function bearerUser(req: Request, deps: AiDraftDeps) {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  return token ? deps.userIdFromToken(token) : null;
}

async function readRequest(req: Request): Promise<AiRequest | null> {
  try {
    return parseAiRequest(await req.json());
  } catch {
    return null;
  }
}

async function callProvider(
  provider: AiProvider,
  request: AiRequest,
  timeoutMs: number,
): Promise<ProviderReply | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  try {
    const call = { ...request, tool: TOOL_SCHEMAS[request.task] };
    return await Promise.race([provider.generate(call, controller.signal), timedOut]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function usable(reply: ProviderReply | null, task: AiTask): reply is ProviderReply {
  return (
    reply !== null &&
    reply.toolName === task &&
    Number.isSafeInteger(reply.inputTokens) &&
    reply.inputTokens >= 0 &&
    Number.isSafeInteger(reply.outputTokens) &&
    reply.outputTokens >= 0 &&
    typeof reply.model === 'string' &&
    reply.model !== '' &&
    validToolResult(task, reply.arguments)
  );
}

// Logs carry a fixed code and never the caught error: a provider or database error can quote the user's prompt, and no
// prompt or response may be kept on the server.
function logCode(code: string) {
  console.error(`ai-draft: ${code}`);
}

export async function handleAiDraft(req: Request, deps: AiDraftDeps): Promise<Response> {
  if (req.method !== 'POST') return failure(405, 'method_not_allowed');
  const userId = await bearerUser(req, deps).catch(() => null);
  if (!userId) return failure(401, 'unauthorized');
  const request = await readRequest(req);
  if (!request) return failure(400, 'invalid_request');
  if (!deps.provider) {
    logCode('provider_not_configured');
    return failure(502, 'provider_error');
  }

  let begun: BeginResult;
  try {
    begun = await deps.store.begin(userId);
  } catch {
    logCode('begin_failed');
    return failure(500, 'server_error');
  }
  if (begun.status !== 'ok') return failure(REFUSALS[begun.status], begun.status);

  const reply = await callProvider(deps.provider, request, deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!usable(reply, request.task)) {
    logCode('provider_error');
    await deps.store.abort(userId, begun.lease).catch(() => logCode('abort_failed'));
    return failure(502, 'provider_error');
  }

  const tokens = reply.inputTokens + reply.outputTokens;
  try {
    const after = await deps.store.finish({
      userId,
      lease: begun.lease,
      task: request.task,
      model: reply.model,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
      energySpent: energyCost(tokens, PLACEHOLDER_FULL_BELLY_TOKENS, begun.energyFull),
    });
    return json(200, { task: request.task, result: reply.arguments, ...after });
  } catch {
    logCode('finish_failed');
    return failure(500, 'server_error');
  }
}
