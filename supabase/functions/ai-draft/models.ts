import type { AiTask } from './tools.ts';

// Changing a pin is a deploy, never a secret: the plan's 「★ Task 9 choices」 cites the Model Studio pages behind each
// ID and price, and the smoke run re-checks them.
export const QWEN_FLASH = 'qwen3.7-flash-2026-07-15';
export const QWEN_PLUS = 'qwen3.7-plus-2026-05-26';
export const QWEN_ASR = 'qwen-audio-3.0-asr-flash';
export const DEEPSEEK_FALLBACK = 'deepseek-v4.1-flash-1017';

export type ChatTask = Exclude<AiTask, 'transcribe'>;

export const PRIMARY_MODEL: Readonly<Record<AiTask, string>> = {
  translate: QWEN_FLASH,
  answer: QWEN_FLASH,
  draft_bounty: QWEN_PLUS,
  ask: QWEN_PLUS,
  transcribe: QWEN_ASR,
};

export const MAX_OUTPUT_TOKENS: Readonly<Record<ChatTask, number>> = {
  translate: 3000,
  answer: 1500,
  draft_bounty: 1000,
  ask: 2000,
};

export const SINGAPORE_PRICES_USD = {
  plusInputPerMillion: 0.4,
  plusOutputPerMillion: 1.6,
  asrPerSecond: 0.000035,
} as const;

export const SINGAPORE_REGION = 'ap-southeast-1';
export const CHAT_PATH = '/compatible-mode/v1/chat/completions';
export const ASR_PATH = '/api/v1/services/aigc/multimodal-generation/generation';

const WORKSPACE_ID = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

export function singaporeOrigin(workspaceId: string): string | null {
  const id = workspaceId.trim().toLowerCase();
  if (!WORKSPACE_ID.test(id)) return null;
  return `https://${id}.${SINGAPORE_REGION}.maas.aliyuncs.com`;
}
