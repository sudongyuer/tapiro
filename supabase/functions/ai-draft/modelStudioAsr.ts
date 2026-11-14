import { transcribeTokens } from './budget.ts';
import { count, isRecord } from './modelStudioChat.ts';
import type { ProviderCall, ProviderReply } from './provider.ts';
import type { AiAudio, AiLanguage } from './tools.ts';

type TranscribeCall = ProviderCall & {
  task: 'transcribe';
  input: { audio: AiAudio; language: AiLanguage };
};

const LANGUAGE_HINTS: Readonly<Record<AiLanguage, string>> = {
  'zh-Hans': 'zh',
  en: 'en',
  ms: 'ms',
};

export function asrBody(call: ProviderCall, model: string) {
  const { audio, language } = (call as TranscribeCall).input;
  return {
    model,
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: `data:${audio.mediaType};base64,${audio.data}` },
            },
          ],
        },
      ],
    },
    parameters: { format: 'm4a', sample_rate: '16000', language_hints: [LANGUAGE_HINTS[language]] },
  };
}

export function readTranscript(body: unknown, model: string): ProviderReply {
  const output = isRecord(body) && isRecord(body.output) ? body.output : null;
  const usage = isRecord(body) && isRecord(body.usage) ? body.usage : null;
  const seconds = count(usage?.duration);
  const text = typeof output?.text === 'string' ? output.text.trim() : null;
  return {
    toolName: text === null ? '' : 'transcript',
    arguments: text === null ? null : { text },
    model,
    inputTokens: Number.isNaN(seconds) ? NaN : transcribeTokens(seconds),
    outputTokens: Number.isNaN(seconds) ? NaN : 0,
  };
}
