import { energyCost, PLACEHOLDER_FULL_BELLY_TOKENS } from './budget.ts';
import type { AiProvider, ProviderReply } from './provider.ts';
import {
  AI_TOOLS,
  parseAiRequest,
  TOOL_SCHEMAS,
  toolsFor,
  validToolResult,
  type AiRequest,
  type AiTask,
  type AiTool,
} from './tools.ts';

export type BeginResult =
  | { status: 'consent_required' | 'hungry' | 'busy' | 'too_many_discards' }
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

export type DiscardRow = Omit<MeterRow, 'energySpent'>;

export type AiStore = {
  begin(userId: string): Promise<BeginResult>;
  finish(row: MeterRow): Promise<{ energy: number; energyFull: number }>;
  discard(row: DiscardRow): Promise<void>;
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

const UNKNOWN_MODEL = 'unknown';

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
    const call = { ...request, tools: toolsFor(request).map((tool) => TOOL_SCHEMAS[tool]) };
    return await Promise.race([provider.generate(call, controller.signal), timedOut]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const isCount = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
const hasModel = (reply: ProviderReply) => typeof reply.model === 'string' && reply.model !== '';

function offeredTool(reply: ProviderReply, request: AiRequest): AiTool | null {
  const tool = AI_TOOLS.find((name) => name === reply.toolName);
  return tool && toolsFor(request).includes(tool) ? tool : null;
}

function usable(reply: ProviderReply, request: AiRequest): AiTool | null {
  const tool = offeredTool(reply, request);
  const valid =
    tool !== null &&
    isCount(reply.inputTokens) &&
    isCount(reply.outputTokens) &&
    hasModel(reply) &&
    validToolResult(tool, reply.arguments);
  return valid ? tool : null;
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
  if (begun.status === 'too_many_discards') {
    logCode('too_many_discards');
    return failure(502, 'provider_error');
  }
  if (begun.status !== 'ok') return failure(REFUSALS[begun.status], begun.status);

  const reply = await callProvider(deps.provider, request, deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (reply === null) {
    logCode('provider_error');
    await deps.store.abort(userId, begun.lease).catch(() => logCode('abort_failed'));
    return failure(502, 'provider_error');
  }
  const tool = usable(reply, request);
  if (tool === null) {
    logCode('reply_discarded');
    await deps.store
      .discard({
        userId,
        lease: begun.lease,
        task: request.task,
        model: hasModel(reply) ? reply.model : UNKNOWN_MODEL,
        inputTokens: isCount(reply.inputTokens) ? reply.inputTokens : 0,
        outputTokens: isCount(reply.outputTokens) ? reply.outputTokens : 0,
      })
      .catch(() => logCode('discard_failed'));
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
    return json(200, { task: request.task, tool, result: reply.arguments, ...after });
  } catch {
    logCode('finish_failed');
    return failure(500, 'server_error');
  }
}
