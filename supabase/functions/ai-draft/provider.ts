import { transcribeTokens } from './budget.ts';
import type { AiInput, AiLanguage, AiRequest, AiTask, ToolSchema } from './tools.ts';
import { TOOL_SCHEMAS } from './tools.ts';

export type ProviderCall = AiRequest & { tools: ToolSchema[] };

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
const FAKE_RECORDING_SECONDS = 6;
const FAKE_USAGE: Readonly<Record<AiTask, { inputTokens: number; outputTokens: number }>> = {
  draft_bounty: { inputTokens: 3000, outputTokens: 600 },
  answer: { inputTokens: 1500, outputTokens: 300 },
  translate: { inputTokens: 300, outputTokens: 60 },
  ask: { inputTokens: 3000, outputTokens: 600 },
  transcribe: { inputTokens: transcribeTokens(FAKE_RECORDING_SECONDS), outputTokens: 0 },
};
const FAKE_TRANSCRIPTS: Readonly<Record<AiLanguage, string>> = {
  'zh-Hans': '明天帮我去 Pyramid 取快递',
  en: 'Pick up my parcel at Pyramid tomorrow',
  ms: 'Tolong ambil bungkusan saya di Pyramid esok',
};
const FAKE_TITLE_MAX = TOOL_SCHEMAS.draft_bounty.parameters.properties!.title.maxLength!;
const FAKE_CLARIFY_UNDER = 7;

const EMPTY_DRAFT = {
  category: 'other',
  rewardMajor: null,
  currency: null,
  description: null,
  deadlineAt: null,
  startsAt: null,
  endsAt: null,
  placeHint: null,
};

const FAKE_PICK = {
  items: [
    {
      summary: '明天帮搬家具 · RM 50',
      draft: { ...EMPTY_DRAFT, title: '明天帮搬家具', category: 'move', rewardMajor: 50 },
    },
    {
      summary: '帮取快递',
      draft: { ...EMPTY_DRAFT, title: '帮取快递', category: 'pickup' },
    },
  ],
};

function fakeAsk({ input }: { input: AiInput }) {
  const text = input.text;
  if (input.image) return { toolName: 'pick', arguments: FAKE_PICK };
  if (/[?？]$/.test(text)) return { toolName: 'answer', arguments: { text: `[fake] ${text}` } };
  if ([...text].length < FAKE_CLARIFY_UNDER) {
    return {
      toolName: 'clarify',
      arguments: { question: '什么时候要？', choices: ['今天下午', '今晚', '明天'] },
    };
  }
  return { toolName: 'draft_bounty', arguments: fakeDraft(text) };
}

function fakeDraft(text: string) {
  return { ...EMPTY_DRAFT, title: [...text].slice(0, FAKE_TITLE_MAX).join('').trim() };
}

export const fakeProvider: AiProvider = {
  async generate(call) {
    const usage = { model: FAKE_MODEL, ...FAKE_USAGE[call.task] };
    if (call.task === 'transcribe') {
      const text = FAKE_TRANSCRIPTS[call.input.language];
      return { ...usage, toolName: 'transcript', arguments: { text } };
    }
    if (call.task === 'ask') return { ...usage, ...fakeAsk(call) };
    const { task, input } = call;
    if (task === 'draft_bounty') {
      return { ...usage, toolName: task, arguments: fakeDraft(input.text) };
    }
    const text = task === 'translate' ? `[${input.to}] ${input.text}` : `[fake] ${input.text}`;
    return { ...usage, toolName: task, arguments: { text } };
  },
};
