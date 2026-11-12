import { MAX_OUTPUT_TOKENS, type ChatTask } from './models.ts';
import { systemPrompt, userContent, type ChatRequest } from './prompts.ts';
import type { ProviderCall, ProviderReply } from './provider.ts';

export type ChatCall = ProviderCall & ChatRequest;

const COMPLETE = new Set(['stop', 'tool_calls']);
const TOOL_CALL_IN_PROSE = /<\/?tool_call>|^\s*[{[]/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const count = (value: unknown) =>
  Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : Number.NaN;

export function requestBody(call: ChatCall, model: string, now: Date) {
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
    max_tokens: MAX_OUTPUT_TOKENS[call.task as ChatTask],
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
