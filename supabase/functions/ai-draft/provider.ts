import type { AiRequest, AiTask, ToolSchema } from './tools.ts';
import { TOOL_SCHEMAS } from './tools.ts';

export type ProviderCall = AiRequest & { tool: ToolSchema };

export type ProviderReply = {
  toolName: string;
  arguments: unknown;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

// An adapter throws only when no response arrived. A billed response with no tool call or unparseable arguments comes back
// as a reply with its real usage, so the handler discards and counts it; thrown errors are not counted, and a prompt that
// made the adapter throw could otherwise spend without limit.
export type AiProvider = {
  generate(call: ProviderCall, signal: AbortSignal): Promise<ProviderReply>;
};

const FAKE_MODEL = 'fake';
const FAKE_USAGE: Readonly<Record<AiTask, { inputTokens: number; outputTokens: number }>> = {
  draft_bounty: { inputTokens: 3000, outputTokens: 600 },
  answer: { inputTokens: 1500, outputTokens: 300 },
  translate: { inputTokens: 300, outputTokens: 60 },
};
const FAKE_TITLE_MAX = TOOL_SCHEMAS.draft_bounty.parameters.properties!.title.maxLength!;

export const fakeProvider: AiProvider = {
  async generate({ task, input }) {
    const usage = { model: FAKE_MODEL, ...FAKE_USAGE[task] };
    if (task === 'draft_bounty') {
      return {
        ...usage,
        toolName: task,
        arguments: {
          title: [...input.text].slice(0, FAKE_TITLE_MAX).join('').trim(),
          category: 'other',
          rewardMajor: null,
          currency: null,
          description: null,
          deadlineAt: null,
          startsAt: null,
          endsAt: null,
          placeHint: null,
        },
      };
    }
    const text = task === 'translate' ? `[${input.to}] ${input.text}` : `[fake] ${input.text}`;
    return { ...usage, toolName: task, arguments: { text } };
  },
};

export function selectProvider(name: string | undefined): AiProvider | null {
  return name === 'fake' ? fakeProvider : null;
}
